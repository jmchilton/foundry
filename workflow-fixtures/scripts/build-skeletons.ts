#!/usr/bin/env tsx
// Build IWC workflow skeletons — structural-only views of iwc-format2/.
//
// Strips parameter blobs, UI metadata, and non-structural IDs, leaving
// tool_id, labels/annotations, the step graph (in/out/source), control flow
// (when:), workflow-level inputs/outputs, and subworkflow descents. Each
// skeleton is ~5-20KB instead of ~100KB-1MB.
//
// Usage:
//   tsx scripts/build-skeletons.ts                         # full corpus
//   tsx scripts/build-skeletons.ts --in DIR --out DIR      # explicit roots
//   tsx scripts/build-skeletons.ts --check                 # exit nonzero if outputs would change

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

interface Args {
  inDir: string;
  outDir: string;
  check: boolean;
}

const TOP_KEEP = new Set(["class", "label", "doc", "tags", "release", "license", "inputs", "outputs", "steps"]);
const STEP_KEEP = new Set(["id", "label", "doc", "tool_id", "when", "in", "out", "run"]);
const INPUT_KEEP = new Set(["id", "type", "optional", "default", "format", "collection_type", "doc"]);
const OUTPUT_KEEP = new Set(["id", "outputSource"]);

type Yaml = unknown;
type Dict = Record<string, Yaml>;

function isDict(v: Yaml): v is Dict {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pick(obj: Dict, allowed: Set<string>): Dict {
  const out: Dict = {};
  for (const k of Object.keys(obj)) {
    if (allowed.has(k)) out[k] = obj[k];
  }
  return out;
}

function reduceWorkflow(wf: Dict): Dict {
  const out: Dict = {};
  for (const k of Object.keys(wf)) {
    if (!TOP_KEEP.has(k)) continue;
    const v = wf[k];
    if (k === "inputs" && Array.isArray(v)) {
      out.inputs = v.map((i) => (isDict(i) ? pick(i, INPUT_KEEP) : i));
    } else if (k === "outputs" && Array.isArray(v)) {
      out.outputs = v.map((o) => (isDict(o) ? pick(o, OUTPUT_KEEP) : o));
    } else if (k === "steps" && Array.isArray(v)) {
      out.steps = v.map((s) => (isDict(s) ? reduceStep(s) : s));
    } else {
      out[k] = v;
    }
  }
  return out;
}

function reduceStep(step: Dict): Dict {
  const out: Dict = {};
  for (const k of Object.keys(step)) {
    if (!STEP_KEEP.has(k)) continue;
    const v = step[k];
    if (k === "out" && Array.isArray(v)) {
      // Keep only ids — rename/hide/add_tags/etc. are post-processing, not topology.
      out.out = v.map((o) => (isDict(o) && typeof o.id === "string" ? { id: o.id } : o));
    } else if (k === "run" && isDict(v)) {
      // Embedded subworkflow — descend recursively.
      out.run = reduceWorkflow(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function* walkYml(root: string): Generator<string> {
  if (!existsSync(root)) return;
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, ent.name);
    if (ent.isDirectory()) {
      yield* walkYml(p);
    } else if (ent.isFile() && ent.name.endsWith(".gxwf.yml")) {
      yield p;
    }
  }
}

function parseArgs(argv: string[]): Args {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const root = path.dirname(here);
  const args: Args = {
    inDir: path.join(root, "iwc-format2"),
    outDir: path.join(root, "iwc-skeletons"),
    check: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in") args.inDir = argv[++i]!;
    else if (a === "--out") args.outDir = argv[++i]!;
    else if (a === "--check") args.check = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.inDir)) {
    process.stderr.write(`input dir not found: ${args.inDir}\n`);
    process.stderr.write(`run scripts/build-iwc.sh first to materialize iwc-format2/.\n`);
    process.exit(1);
  }

  const files: string[] = [];
  for (const f of walkYml(args.inDir)) files.push(f);
  files.sort();

  let drift = 0;
  let written = 0;
  let bytesIn = 0;
  let bytesOut = 0;

  if (!args.check && existsSync(args.outDir)) rmSync(args.outDir, { recursive: true, force: true });

  for (const inPath of files) {
    const rel = path.relative(args.inDir, inPath);
    const outPath = path.join(args.outDir, rel);
    const raw = readFileSync(inPath, "utf8");
    bytesIn += statSync(inPath).size;
    let doc: Yaml;
    try {
      doc = yaml.load(raw);
    } catch (e) {
      process.stderr.write(`!! parse error: ${rel}: ${(e as Error).message}\n`);
      continue;
    }
    if (!isDict(doc)) continue;
    const reduced = reduceWorkflow(doc);
    const dumped = yaml.dump(reduced, { lineWidth: -1, noRefs: true });

    if (args.check) {
      if (!existsSync(outPath) || readFileSync(outPath, "utf8") !== dumped) drift++;
    } else {
      mkdirSync(path.dirname(outPath), { recursive: true });
      writeFileSync(outPath, dumped);
      written++;
      bytesOut += Buffer.byteLength(dumped, "utf8");
    }
  }

  if (args.check) {
    if (drift > 0) {
      process.stderr.write(`!! ${drift} skeleton(s) drift; rerun without --check.\n`);
      process.exit(1);
    }
    process.stdout.write(`ok: ${files.length} skeleton(s) up to date\n`);
    return;
  }

  const ratio = bytesIn > 0 ? ((bytesOut / bytesIn) * 100).toFixed(1) : "n/a";
  process.stdout.write(
    `wrote ${written} skeleton(s) to ${args.outDir} ` +
      `(${(bytesIn / 1024).toFixed(0)}KB -> ${(bytesOut / 1024).toFixed(0)}KB, ${ratio}% of source)\n`,
  );
}

main();

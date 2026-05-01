#!/usr/bin/env tsx
// Deterministic half of mold casting — the "small program" the mold's own §Method
// describes, but applied to casting itself: copy declared references verbatim,
// hash them, refresh forensic fields in _provenance.json, validate any runs/*.json
// against the schema. The LLM-driven half (authoring SKILL.md, deciding what
// survives the cast-time/runtime cut) lives in a separate cast skill.
//
// Usage:
//   tsx scripts/cast-mold.ts <mold-name> [--target=claude] [--check] [--note="..."]
//
// Reads casts/<target>/<mold-name>/_provenance.json for declared references
// (transitional: see issue #16 — mold schema does not yet declare research notes
// as typed references). Writes back the same file with refreshed forensics.

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = ((AjvImport as any).default ?? AjvImport) as typeof AjvImport;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = ((addFormatsImport as any).default ?? addFormatsImport) as typeof addFormatsImport;

interface RefEntry {
  src: string;
  dst: string;
  mode: string;
  slot?: string[];
  status?: string;
  hash?: string;
}

interface Provenance {
  cast_target: string;
  mold: { name: string; path: string; revision?: number };
  schema?: { path: string; note_revision?: number };
  cast_method?: string;
  cast_date?: string;
  cast_revision?: number;
  cast_agent?: string;
  cast_history?: Array<{ rev: number; date: string; note: string }>;
  references: { schemas?: RefEntry[]; notes?: RefEntry[]; examples?: RefEntry[]; patterns?: RefEntry[] };
  open_questions?: string[];
  // Forensic fields (per docs/COMPILATION_PIPELINE.md)
  mold_content_hash?: string;
  mold_commit?: string;
  cast_at?: string;
}

interface Args {
  moldName: string;
  target: string;
  check: boolean;
  note: string | null;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let target = "claude";
  let check = false;
  let note: string | null = null;
  for (const a of argv) {
    if (a === "--check") check = true;
    else if (a.startsWith("--target=")) target = a.slice("--target=".length);
    else if (a.startsWith("--note=")) note = a.slice("--note=".length);
    else if (!a.startsWith("--")) positional.push(a);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (positional.length !== 1) {
    throw new Error("usage: cast-mold <mold-name> [--target=claude] [--check] [--note=\"...\"]");
  }
  return { moldName: positional[0]!, target, check, note };
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function gitHead(repoRoot: string): string | undefined {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function copyVerbatim(srcAbs: string, dstAbs: string): void {
  mkdirSync(path.dirname(dstAbs), { recursive: true });
  copyFileSync(srcAbs, dstAbs);
}

interface RefDrift {
  ref: RefEntry;
  reason: string;
}

function processRefs(
  refs: RefEntry[] | undefined,
  repoRoot: string,
  bundleRoot: string,
  check: boolean,
): { updated: RefEntry[]; drift: RefDrift[]; errors: string[] } {
  const drift: RefDrift[] = [];
  const errors: string[] = [];
  const updated: RefEntry[] = [];
  for (const ref of refs ?? []) {
    const srcAbs = path.join(repoRoot, ref.src);
    const dstAbs = path.join(bundleRoot, ref.dst);
    if (!existsSync(srcAbs)) {
      errors.push(`ref source missing: ${ref.src}`);
      updated.push(ref);
      continue;
    }
    const srcHash = sha256(srcAbs);
    const dstExists = existsSync(dstAbs);
    const dstHash = dstExists ? sha256(dstAbs) : null;
    if (dstHash !== srcHash) {
      drift.push({ ref, reason: dstExists ? "dst hash differs from src" : "dst missing" });
      if (!check) copyVerbatim(srcAbs, dstAbs);
    }
    if (ref.hash && ref.hash !== srcHash) {
      drift.push({ ref, reason: `recorded hash ${ref.hash.slice(0, 12)}… differs from src ${srcHash.slice(0, 12)}…` });
    }
    updated.push({ ...ref, hash: srcHash });
  }
  return { updated, drift, errors };
}

function loadAjvForSchema(schemaPath: string): ReturnType<InstanceType<typeof Ajv>["compile"]> {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  return ajv.compile(schema);
}

function validateRuns(bundleRoot: string, schemaAbs: string): string[] {
  const errors: string[] = [];
  const runsDir = path.join(bundleRoot, "runs");
  if (!existsSync(runsDir)) return errors;
  const validate = loadAjvForSchema(schemaAbs);
  for (const entry of readdirSync(runsDir)) {
    const summaryPath = path.join(runsDir, entry, "summary.json");
    if (!existsSync(summaryPath)) continue;
    const data = JSON.parse(readFileSync(summaryPath, "utf8"));
    if (!validate(data)) {
      const messages = (validate.errors ?? []).map((e) => `    ${e.instancePath || "(root)"}: ${e.message}`);
      errors.push(`runs/${entry}/summary.json:\n${messages.join("\n")}`);
    }
  }
  return errors;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const bundleRoot = path.join(repoRoot, "casts", args.target, args.moldName);
  const provenancePath = path.join(bundleRoot, "_provenance.json");

  if (!existsSync(provenancePath)) {
    console.error(`no provenance at ${provenancePath} — initial cast must be hand-authored (see SKILL.md)`);
    process.exit(2);
  }
  const prov = JSON.parse(readFileSync(provenancePath, "utf8")) as Provenance;

  const moldAbs = path.join(repoRoot, prov.mold.path);
  if (!existsSync(moldAbs)) {
    console.error(`mold source missing: ${prov.mold.path}`);
    process.exit(2);
  }
  const moldHash = sha256(moldAbs);

  const allErrors: string[] = [];
  const allDrift: RefDrift[] = [];

  if (prov.mold_content_hash && prov.mold_content_hash !== moldHash) {
    allDrift.push({ ref: { src: prov.mold.path, dst: "(mold)", mode: "verbatim" }, reason: `mold hash drifted from recorded` });
  }

  const schemaResult = processRefs(prov.references.schemas, repoRoot, bundleRoot, args.check);
  const notesResult = processRefs(prov.references.notes, repoRoot, bundleRoot, args.check);
  const examplesResult = processRefs(prov.references.examples, repoRoot, bundleRoot, args.check);
  const patternsResult = processRefs(prov.references.patterns, repoRoot, bundleRoot, args.check);
  allErrors.push(...schemaResult.errors, ...notesResult.errors, ...examplesResult.errors, ...patternsResult.errors);
  allDrift.push(...schemaResult.drift, ...notesResult.drift, ...examplesResult.drift, ...patternsResult.drift);

  // Schema validation of any runs/*/summary.json
  const firstSchema = (prov.references.schemas ?? [])[0];
  if (firstSchema) {
    const schemaAbs = path.join(bundleRoot, firstSchema.dst);
    if (existsSync(schemaAbs)) {
      allErrors.push(...validateRuns(bundleRoot, schemaAbs));
    }
  }

  // Report
  for (const e of allErrors) console.error(`error: ${e}`);
  for (const d of allDrift) console.error(`drift: ${d.ref.src} — ${d.reason}`);

  if (args.check) {
    if (allErrors.length || allDrift.length) {
      console.error(`check failed: ${allErrors.length} error(s), ${allDrift.length} drift(s)`);
      process.exit(1);
    }
    console.log("clean: no drift, no errors");
    return;
  }

  if (allErrors.length) {
    console.error(`refusing to update provenance: ${allErrors.length} error(s)`);
    process.exit(1);
  }

  // Refresh provenance
  const next: Provenance = {
    ...prov,
    references: {
      ...(prov.references.schemas !== undefined && { schemas: schemaResult.updated }),
      ...(prov.references.notes !== undefined && { notes: notesResult.updated }),
      ...(prov.references.examples !== undefined && { examples: examplesResult.updated }),
      ...(prov.references.patterns !== undefined && { patterns: patternsResult.updated }),
    },
    mold_content_hash: moldHash,
    mold_commit: gitHead(repoRoot),
    cast_at: new Date().toISOString(),
  };

  if (args.note) {
    const today = new Date().toISOString().slice(0, 10);
    const lastRev = (prov.cast_history ?? []).reduce((m, h) => Math.max(m, h.rev), 0);
    next.cast_history = [...(prov.cast_history ?? []), { rev: lastRev + 1, date: today, note: args.note }];
    next.cast_revision = lastRev + 1;
    next.cast_date = today;
  }

  writeFileSync(provenancePath, JSON.stringify(next, null, 2) + "\n");
  console.log(`wrote ${path.relative(repoRoot, provenancePath)}`);
  if (allDrift.length) console.log(`reconciled ${allDrift.length} drifted ref(s)`);
}

main();

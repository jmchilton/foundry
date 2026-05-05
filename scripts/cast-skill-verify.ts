#!/usr/bin/env tsx
// Deterministic verifier for a generated Claude skill cast.
//
// Verifies a cast bundle is internally consistent against the Mold's manifest
// and the target's constraints — without re-running the deterministic copy.
// Agentic verification (when a Mold ships cast-skill-verification.md) is run
// by the /cast slash command, not from this CLI.
//
// Usage:
//   tsx scripts/cast-skill-verify.ts <mold-name> [--target=claude]

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import AjvImport from "ajv";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import yaml from "js-yaml";

import { readMarkdown } from "./lib/frontmatter.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = ((AjvImport as any).default ?? AjvImport) as typeof AjvImport;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv2020 = ((Ajv2020Import as any).default ?? Ajv2020Import) as typeof Ajv2020Import;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = ((addFormatsImport as any).default ?? addFormatsImport) as typeof addFormatsImport;

interface Args {
  moldName: string;
  target: string;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let target = "claude";
  for (const a of argv) {
    if (a.startsWith("--target=")) target = a.slice("--target=".length);
    else if (!a.startsWith("--")) positional.push(a);
    else throw new Error(`unknown flag: ${a}`);
  }
  if (positional.length !== 1) {
    throw new Error("usage: cast-skill-verify <mold-name> [--target=claude]");
  }
  return { moldName: positional[0]!, target };
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

interface TargetConfig {
  name: string;
  required_outputs: string[];
  skill_constraints: {
    frontmatter_required: string[];
    forbidden_runtime_paths: string[];
    forbid_packaged_files: string[];
  };
}

interface ProvenanceRefEntry {
  kind: string;
  mode: string;
  ref?: string;
  src: string;
  dst: string;
  used_at: string;
  load: string;
  trigger?: string;
  src_hash: string | null;
  dst_hash: string | null;
  source: "deterministic" | "llm";
  pending_llm?: boolean;
  prompt?: { origin: string; identity: string; hash?: string };
}

interface Provenance {
  provenance_schema_version: number;
  cast_target: string;
  mold: { name: string; path: string; content_hash: string };
  refs: ProvenanceRefEntry[];
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  const targetCfgPath = path.join(repoRoot, "casts", args.target, "_target.yml");
  if (!existsSync(targetCfgPath)) fail(`missing target config: ${targetCfgPath}`);
  const target = yaml.load(readFileSync(targetCfgPath, "utf8")) as TargetConfig;

  // Claude target casts live under skills/ (plugin layout).
  const bundleRoot = args.target === "claude"
    ? path.join(repoRoot, "casts", args.target, "skills", args.moldName)
    : path.join(repoRoot, "casts", args.target, args.moldName);
  if (!existsSync(bundleRoot)) fail(`missing bundle: ${bundleRoot}`);

  const errors: string[] = [];

  // Provenance must exist and validate against the schema.
  const provenancePath = path.join(bundleRoot, "_provenance.json");
  if (!existsSync(provenancePath)) {
    fail(`missing _provenance.json in ${bundleRoot}`);
  }
  const prov = JSON.parse(readFileSync(provenancePath, "utf8")) as Provenance;
  const schemaPath = path.join(repoRoot, "scripts", "lib", "schemas", "cast-provenance.schema.json");
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validateProv = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));
  if (!validateProv(prov)) {
    for (const err of validateProv.errors ?? []) {
      errors.push(`_provenance.json: ${err.instancePath || "(root)"} ${err.message}`);
    }
  }

  // Required outputs.
  for (const rel of target.required_outputs) {
    const abs = path.join(bundleRoot, rel);
    if (!existsSync(abs)) errors.push(`missing required output: ${rel}`);
  }

  // SKILL.md frontmatter.
  const skillPath = path.join(bundleRoot, "SKILL.md");
  let skillBody = "";
  if (existsSync(skillPath)) {
    const parsed = readMarkdown(skillPath);
    if (!parsed.hasFrontmatter) errors.push("SKILL.md: missing frontmatter");
    for (const f of target.skill_constraints.frontmatter_required) {
      if (typeof parsed.meta[f] !== "string" || (parsed.meta[f] as string).trim() === "") {
        errors.push(`SKILL.md: frontmatter requires non-empty '${f}'`);
      }
    }
    skillBody = parsed.body;
    // Forbid leakage of Foundry source paths into runtime instructions.
    for (const forbidden of target.skill_constraints.forbidden_runtime_paths) {
      if (skillBody.includes(forbidden)) {
        errors.push(`SKILL.md: contains forbidden runtime path '${forbidden}'`);
      }
    }
    // Forbid raw wiki-links in SKILL.md.
    if (/\[\[[^\]]+\]\]/.test(skillBody)) {
      errors.push("SKILL.md: contains raw [[wiki-link]] (must be resolved or stripped)");
    }
  }

  // Per-ref checks.
  for (const r of prov.refs ?? []) {
    if (r.pending_llm) {
      errors.push(`ref ${r.src}: pending_llm — committed cast must not contain unfilled condense entries`);
      continue;
    }
    const dstAbs = path.join(bundleRoot, r.dst);
    if (!existsSync(dstAbs)) {
      errors.push(`ref ${r.src}: dst missing at ${r.dst}`);
      continue;
    }
    const dstHash = sha256(dstAbs);
    if (r.dst_hash && r.dst_hash !== dstHash) {
      errors.push(`ref ${r.src}: dst hash drift (recorded ${r.dst_hash.slice(0, 12)}, actual ${dstHash.slice(0, 12)})`);
    }
    // For verbatim deterministic refs, src and dst hashes must match.
    if (r.source === "deterministic" && r.mode === "verbatim" && r.src_hash !== r.dst_hash) {
      errors.push(`ref ${r.src}: verbatim copy mismatch (src vs dst hashes differ)`);
    }
    // Bundled JSON schemas must parse.
    if (r.kind === "schema") {
      try {
        JSON.parse(readFileSync(dstAbs, "utf8"));
      } catch (e) {
        errors.push(`ref ${r.src}: bundled schema does not parse as JSON: ${(e as Error).message}`);
      }
    }
    // CLI sidecars must parse as JSON.
    if (r.kind === "cli-command" && r.mode === "sidecar") {
      try {
        JSON.parse(readFileSync(dstAbs, "utf8"));
      } catch (e) {
        errors.push(`ref ${r.src}: sidecar does not parse as JSON: ${(e as Error).message}`);
      }
    }
    // on-demand refs should have trigger text represented in SKILL.md (best-effort: filename basename appears).
    if (r.load === "on-demand" && r.used_at !== "cast-time" && skillBody) {
      const dstBase = path.basename(r.dst);
      if (!skillBody.includes(dstBase) && !skillBody.includes(r.dst)) {
        errors.push(`ref ${r.src}: on-demand runtime ref not referenced in SKILL.md (looked for '${dstBase}')`);
      }
    }
  }

  // Forbidden packaged files: e.g. eval.md must not be inside the bundle.
  for (const forbidden of target.skill_constraints.forbid_packaged_files) {
    const matches = walkAndFind(bundleRoot, forbidden);
    if (matches.length) errors.push(`forbidden file packaged: ${matches.join(", ")}`);
  }

  // runs/*/summary.json validates against the bundled schema (when present).
  const schemaRef =
    (prov.refs ?? []).find((r) => r.kind === "schema" && r.ref === "[[summary-nextflow]]") ??
    (prov.refs ?? []).find((r) => r.kind === "schema");
  if (schemaRef) {
    const schemaAbs = path.join(bundleRoot, schemaRef.dst);
    if (existsSync(schemaAbs)) {
      try {
        const schemaJson = JSON.parse(readFileSync(schemaAbs, "utf8"));
        const schemaUri = typeof schemaJson?.$schema === "string" ? schemaJson.$schema : "";
        const runAjv = schemaUri.includes("2020-12")
          ? new Ajv2020({ allErrors: true, strict: false })
          : new Ajv({ allErrors: true, strict: false });
        addFormats(runAjv);
        const validate = runAjv.compile(schemaJson);
        const runsDir = path.join(bundleRoot, "runs");
        if (existsSync(runsDir)) {
          for (const summary of walkAndFind(runsDir, "summary.json")) {
            const data = JSON.parse(readFileSync(summary, "utf8"));
            if (!validate(data)) {
              const messages = (validate.errors ?? []).map((e) => `${e.instancePath || "(root)"} ${e.message}`).join("; ");
              errors.push(`${path.relative(bundleRoot, summary)} fails bundled schema: ${messages}`);
            }
          }
        }
      } catch (e) {
        errors.push(`bundled schema unusable for runs validation: ${(e as Error).message}`);
      }
    }
  }

  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`verify failed: ${errors.length} error(s)`);
    process.exit(1);
  }
  console.log(`verify clean: ${(prov.refs ?? []).length} ref(s)`);
}

function walkAndFind(root: string, basename: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) stack.push(full);
      else if (e === basename) out.push(full);
    }
  }
  return out;
}

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(2);
}

main();

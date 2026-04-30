#!/usr/bin/env tsx
// Foundry frontmatter validator.
// See INITIAL_ARCHITECTURE.md §6 for the layered pipeline.

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import AjvImport, { type ErrorObject } from "ajv";
import addFormatsImport from "ajv-formats";

// Ajv ships CJS+ESM with quirky default-export typing under bundler resolution.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = ((AjvImport as any).default ?? AjvImport) as typeof AjvImport;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = ((addFormatsImport as any).default ?? addFormatsImport) as typeof addFormatsImport;
import { readMarkdown } from "./lib/frontmatter.js";
import { loadSchema, loadTags } from "./lib/schema.js";
import type { FileMeta, Frontmatter, JsonSchema, ValidationResult } from "./lib/types.js";
import { fileSlug, findMdFiles } from "./lib/walk.js";
import { resolveWikiLink, slugify, stripBrackets, WIKI_LINK_RE } from "./lib/wiki-links.js";

interface CliArgs {
  directory: string;
  schemaPath: string;
  tagsPath: string;
}

const TYPE_TAG_MAP: Record<string, string> = {
  "mold|": "mold",
  "pattern|": "pattern",
  "cli-command|": "cli-command",
  "pipeline|": "pipeline",
  "research|component": "research/component",
  "research|design-problem": "research/design-problem",
  "research|design-spec": "research/design-spec",
  "schema|": "schema",
};

/** Single-value vs array wiki-link fields. Schema's regex catches missing brackets; this catches whitespace-only inner text. */
const WIKI_LINK_FIELDS: Record<string, "single" | "array"> = {
  parent_pattern: "single",
  related_notes: "array",
  related_patterns: "array",
  related_molds: "array",
  patterns: "array",
  cli_commands: "array",
  prompts: "array",
};

// ---- per-file validation ----

export function validateData(data: Frontmatter, schema: JsonSchema): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  result.errors.push(...validateSchema(data, schema));
  result.errors.push(...validateDates(data));
  const wiki = validateWikiLinks(data);
  result.errors.push(...wiki.errors);
  result.warnings.push(...wiki.warnings);
  result.warnings.push(...validateTagCoherence(data));
  return result;
}

function validateSchema(data: Frontmatter, schema: JsonSchema): string[] {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (validate(data)) return [];
  const errors = (validate.errors ?? []).slice().sort((a: ErrorObject, b: ErrorObject) => {
    return (a.instancePath || "").localeCompare(b.instancePath || "");
  });
  return errors.map((e: ErrorObject) => {
    const loc = e.instancePath.replace(/^\//, "").replace(/\//g, ".") || "(root)";
    const params = e.params as Record<string, unknown> | undefined;
    const extra = params?.additionalProperty
      ? ` ('${String(params.additionalProperty)}')`
      : "";
    return `${loc}: ${e.message ?? "validation failed"}${extra}`;
  });
}

function validateDates(data: Frontmatter): string[] {
  const errors: string[] = [];
  for (const field of ["created", "revised"] as const) {
    const v = data[field];
    if (typeof v !== "string") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
      errors.push(`${field}: '${v}' is not a valid ISO date (YYYY-MM-DD)`);
    }
  }
  return errors;
}

function validateWikiLinks(data: Frontmatter): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  for (const [field, mode] of Object.entries(WIKI_LINK_FIELDS)) {
    const v = data[field];
    if (v === undefined) continue;
    const values = mode === "single" ? [v] : Array.isArray(v) ? v : [];
    values.forEach((val, i) => {
      if (typeof val !== "string") return;
      const m = WIKI_LINK_RE.exec(val);
      if (!m) return;
      const inner = m[1];
      if (inner !== undefined && inner.trim() === "") {
        const loc = mode === "array" ? `${field}[${i}]` : field;
        result.errors.push(`${loc}: wiki link has whitespace-only inner text: '${val}'`);
      }
    });
  }
  return result;
}

function validateTagCoherence(data: Frontmatter): string[] {
  const tags = data.tags;
  const noteType = data.type;
  const subtype = data.subtype;
  if (!Array.isArray(tags) || typeof noteType !== "string") return [];
  const key = `${noteType}|${typeof subtype === "string" ? subtype : ""}`;
  const expected = TYPE_TAG_MAP[key] ?? TYPE_TAG_MAP[`${noteType}|`];
  if (!expected) return [];
  const matches = tags.some(
    (t) => typeof t === "string" && (t === expected || t.startsWith(expected + "/")),
  );
  if (matches) return [];
  return [`tags: expected '${expected}' tag for type=${noteType}${subtype ? `, subtype=${subtype}` : ""} but tags are ${JSON.stringify(tags)}`];
}

// ---- cross-file validation ----

interface CrossFileFinding {
  path: string;
  message: string;
  severity: "error" | "warning";
}

function buildSlugMap(files: FileMeta[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of files) m.set(slugify(f.slug), f.path);
  return m;
}

function validateBidirectionalRelatedNotes(
  files: FileMeta[],
  slugMap: Map<string, string>,
): CrossFileFinding[] {
  const forward = new Map<string, Set<string>>();
  for (const f of files) {
    const targets = new Set<string>();
    const rns = f.meta.related_notes;
    if (Array.isArray(rns)) {
      for (const wl of rns) {
        const tp = resolveWikiLink(wl, slugMap);
        if (tp && tp !== f.path) targets.add(tp);
      }
    }
    forward.set(f.path, targets);
  }
  const slugByPath = new Map<string, string>();
  for (const f of files) slugByPath.set(f.path, f.slug);
  const findings: CrossFileFinding[] = [];
  for (const [a, targets] of forward) {
    for (const b of targets) {
      const back = forward.get(b);
      if (!back || back.has(a)) continue;
      const aSlug = slugByPath.get(a) ?? a;
      findings.push({
        path: b,
        severity: "warning",
        message: `related_notes: missing backlink to [[${aSlug}]] (declared in ${a})`,
      });
    }
  }
  return findings;
}

/**
 * For Mold typed-references, ensure wiki-link refs resolve to a note of the
 * expected type. (Schema-/example-/prompt-path checks deferred until those
 * kinds appear — matches `INITIAL_ARCHITECTURE.md` §6 sketch.)
 */
function validateMoldRefs(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const checks: Array<{ field: string; expected: string }> = [
    { field: "patterns", expected: "pattern" },
    { field: "cli_commands", expected: "cli-command" },
    { field: "related_patterns", expected: "pattern" },
    { field: "related_molds", expected: "mold" },
  ];
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    for (const c of checks) {
      const v = f.meta[c.field];
      if (!Array.isArray(v)) continue;
      for (const wl of v) {
        const tp = resolveWikiLink(wl, slugMap);
        if (!tp) {
          findings.push({
            path: f.path,
            severity: "error",
            message: `${c.field}: wiki link ${wl} did not resolve`,
          });
          continue;
        }
        const targetType = metaByPath.get(tp)?.type;
        if (targetType !== c.expected) {
          findings.push({
            path: f.path,
            severity: "error",
            message: `${c.field}: wiki link ${wl} resolves to type=${targetType ?? "(none)"}, expected ${c.expected}`,
          });
        }
      }
    }
  }
  return findings;
}

interface PhaseRefs {
  /** Mold paths referenced in a Mold-shaped phase. */
  moldPaths: Set<string>;
  /** Mold paths referenced via [branch] inner wiki-links. */
  branchedMoldPaths: Set<string>;
}

function collectPhaseMoldRefs(
  phases: unknown[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  filePath: string,
): { findings: CrossFileFinding[]; refs: PhaseRefs } {
  const findings: CrossFileFinding[] = [];
  const refs: PhaseRefs = { moldPaths: new Set(), branchedMoldPaths: new Set() };

  phases.forEach((phase, i) => {
    if (typeof phase !== "object" || phase === null || Array.isArray(phase)) {
      findings.push({
        path: filePath,
        severity: "error",
        message: `phases[${i}]: must be an object`,
      });
      return;
    }
    const p = phase as Record<string, unknown>;

    if ("mold" in p) {
      const tp = resolveWikiLink(p.mold, slugMap);
      if (!tp) {
        findings.push({
          path: filePath,
          severity: "error",
          message: `phases[${i}].mold: wiki link ${String(p.mold)} did not resolve`,
        });
      } else if (metaByPath.get(tp)?.type !== "mold") {
        findings.push({
          path: filePath,
          severity: "error",
          message: `phases[${i}].mold: ${String(p.mold)} resolves to type=${String(metaByPath.get(tp)?.type)}, expected mold`,
        });
      } else {
        refs.moldPaths.add(tp);
      }
      return;
    }

    if ("branch" in p) {
      // Walk `branches` array of wiki-link strings or { fallthrough: <wiki> } objects;
      // and `chain` array of wiki-link strings or terminal sentinels (e.g. "user-supplied").
      const collectFromList = (list: unknown, locTag: string): void => {
        if (!Array.isArray(list)) return;
        list.forEach((item, j) => {
          let candidate: unknown = item;
          if (typeof item === "object" && item !== null && !Array.isArray(item)) {
            const obj = item as Record<string, unknown>;
            if ("fallthrough" in obj) candidate = obj.fallthrough;
            else return; // unknown shape — ignore for now (open-set)
          }
          if (typeof candidate !== "string") return;
          if (!WIKI_LINK_RE.test(candidate)) return; // sentinels like "user-supplied"
          const tp = resolveWikiLink(candidate, slugMap);
          if (!tp) {
            findings.push({
              path: filePath,
              severity: "error",
              message: `phases[${i}].${locTag}[${j}]: wiki link ${candidate} did not resolve`,
            });
          } else if (metaByPath.get(tp)?.type !== "mold") {
            findings.push({
              path: filePath,
              severity: "error",
              message: `phases[${i}].${locTag}[${j}]: ${candidate} resolves to type=${String(metaByPath.get(tp)?.type)}, expected mold`,
            });
          } else {
            refs.branchedMoldPaths.add(tp);
          }
        });
      };
      collectFromList(p.branches, "branches");
      collectFromList(p.chain, "chain");
      return;
    }

    // Open-set: unknown phase kind. Warn so we notice but don't fail.
    const knownKeys = Object.keys(p);
    findings.push({
      path: filePath,
      severity: "warning",
      message: `phases[${i}]: unknown phase kind (keys: ${knownKeys.join(",")}) — coin a tag if this is intentional`,
    });
  });

  return { findings, refs };
}

function validatePipelinePhases(
  files: FileMeta[],
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const moldsReferenced = new Set<string>();
  for (const f of files) {
    if (f.meta.type !== "pipeline") continue;
    const phases = f.meta.phases;
    if (!Array.isArray(phases)) continue;
    const r = collectPhaseMoldRefs(phases, slugMap, metaByPath, f.path);
    findings.push(...r.findings);
    for (const p of r.refs.moldPaths) moldsReferenced.add(p);
    for (const p of r.refs.branchedMoldPaths) moldsReferenced.add(p);
  }
  // Inventory coverage warning: Molds with zero pipeline membership.
  // Exempts axis=tool-specific (CLI Molds are standalone whole-CLI casts) and drafts.
  const orphans: string[] = [];
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    if (f.meta.status === "draft") continue;
    if (f.meta.axis === "tool-specific") continue;
    if (!moldsReferenced.has(f.path)) orphans.push(f.slug);
  }
  if (orphans.length > 0) {
    findings.push({
      path: "(inventory)",
      severity: "warning",
      message: `Molds with zero pipeline membership: ${orphans.sort().join(", ")}`,
    });
  }
  return findings;
}

// ---- driver ----

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    directory: "content",
    schemaPath: "meta_schema.yml",
    tagsPath: "meta_tags.yml",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--schema") args.schemaPath = argv[++i] ?? args.schemaPath;
    else if (a === "--tags") args.tagsPath = argv[++i] ?? args.tagsPath;
    else if (a && !a.startsWith("--")) args.directory = a;
  }
  return args;
}

export interface ValidateOptions {
  directory: string;
  schemaPath: string;
  tagsPath: string;
}

export function validateDirectory(opts: ValidateOptions): {
  errors: number;
  warnings: number;
  filesChecked: number;
} {
  const tags = loadTags(opts.tagsPath);
  const schema = loadSchema(opts.schemaPath, tags);

  let errorCount = 0;
  let warningCount = 0;
  let filesChecked = 0;
  const validFiles: FileMeta[] = [];
  const printedHeaders = new Set<string>();

  const printHeader = (filePath: string): void => {
    if (printedHeaders.has(filePath)) return;
    printedHeaders.add(filePath);
    process.stdout.write(`\n${filePath}:\n`);
  };

  for (const filePath of findMdFiles(opts.directory)) {
    filesChecked++;
    const parsed = readMarkdown(filePath);
    if (!parsed.hasFrontmatter) {
      printHeader(filePath);
      process.stdout.write(`  ERROR  no frontmatter found\n`);
      errorCount++;
      continue;
    }
    const r = validateData(parsed.meta, schema);
    if (r.errors.length || r.warnings.length) printHeader(filePath);
    for (const e of r.errors) {
      process.stdout.write(`  ERROR  ${e}\n`);
      errorCount++;
    }
    for (const w of r.warnings) {
      process.stdout.write(`  WARN   ${w}\n`);
      warningCount++;
    }
    if (r.errors.length === 0) {
      validFiles.push({
        path: filePath,
        relPath: path.relative(opts.directory, filePath),
        slug: fileSlug(filePath),
        meta: parsed.meta,
      });
    }
  }

  // Cross-file passes.
  const slugMap = buildSlugMap(validFiles);
  const metaByPath = new Map<string, Frontmatter>();
  for (const f of validFiles) metaByPath.set(f.path, f.meta);

  const crossFindings: CrossFileFinding[] = [];
  crossFindings.push(...validateBidirectionalRelatedNotes(validFiles, slugMap));
  crossFindings.push(...validateMoldRefs(validFiles, slugMap, metaByPath));
  crossFindings.push(...validatePipelinePhases(validFiles, slugMap, metaByPath));

  for (const f of crossFindings) {
    printHeader(f.path);
    if (f.severity === "error") {
      process.stdout.write(`  ERROR  ${f.message}\n`);
      errorCount++;
    } else {
      process.stdout.write(`  WARN   ${f.message}\n`);
      warningCount++;
    }
  }

  process.stdout.write(`\n${"=".repeat(50)}\n`);
  process.stdout.write(`Files: ${filesChecked}  Errors: ${errorCount}  Warnings: ${warningCount}\n`);
  return { errors: errorCount, warnings: warningCount, filesChecked };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.directory) || !statSync(args.directory).isDirectory()) {
    process.stderr.write(`directory not found: ${args.directory}\n`);
    process.exit(2);
  }
  const { errors } = validateDirectory(args);
  process.exit(errors > 0 ? 1 : 0);
}

const isDirectInvocation = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvocation) main();

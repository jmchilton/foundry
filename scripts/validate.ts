#!/usr/bin/env tsx
// Foundry frontmatter validator.
// See INITIAL_ARCHITECTURE.md §6 for the layered pipeline.

import { existsSync, readdirSync, statSync } from "node:fs";
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
  const refs = data.references;
  if (Array.isArray(refs)) {
    refs.forEach((ref, i) => {
      if (typeof ref !== "object" || ref === null || Array.isArray(ref)) return;
      const value = (ref as Record<string, unknown>).ref;
      if (typeof value !== "string") return;
      const m = WIKI_LINK_RE.exec(value);
      if (!m) return;
      const inner = m[1];
      if (inner !== undefined && inner.trim() === "") {
        result.errors.push(`references[${i}].ref: wiki link has whitespace-only inner text: '${value}'`);
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
  for (const f of files) {
    m.set(slugify(f.slug), f.path);
    if (f.meta.type === "cli-command" && typeof f.meta.tool === "string" && typeof f.meta.command === "string") {
      m.set(slugify(`${f.meta.tool} ${f.meta.command}`), f.path);
    }
  }
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
  contentRoot: string,
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
    const typedRefs = f.meta.references;
    if (Array.isArray(typedRefs)) {
      typedRefs.forEach((ref, i) => {
        validateTypedReference(ref, i, f.path, contentRoot, slugMap, metaByPath, findings);
      });
    }
  }
  return findings;
}

function validateTypedReference(
  raw: unknown,
  index: number,
  filePath: string,
  contentRoot: string,
  slugMap: Map<string, string>,
  metaByPath: Map<string, Frontmatter>,
  findings: CrossFileFinding[],
): void {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return;
  const ref = raw as Record<string, unknown>;
  if (typeof ref.kind !== "string" || typeof ref.ref !== "string") return;
  if (ref.evidence === "hypothesis" && typeof ref.verification !== "string") {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: evidence=hypothesis requires verification`,
    });
  }
  if (ref.load === "on-demand" && typeof ref.trigger !== "string") {
    findings.push({
      path: filePath,
      severity: "warning",
      message: `references[${index}]: load=on-demand should describe the trigger`,
    });
  }

  const expectedTypes: Record<string, string> = {
    pattern: "pattern",
    "cli-command": "cli-command",
    prompt: "prompt",
    research: "research",
  };

  if (ref.kind === "schema") {
    // Wiki-link form: must resolve to a `type: schema` note that has both
    // `package` and `package_export` (cast-mold imports the named export).
    if (WIKI_LINK_RE.test(ref.ref)) {
      const tp = resolveWikiLink(ref.ref, slugMap);
      if (!tp) {
        findings.push({
          path: filePath,
          severity: "error",
          message: `references[${index}]: schema ref ${ref.ref} did not resolve`,
        });
        return;
      }
      const noteMeta = metaByPath.get(tp);
      if (noteMeta?.type !== "schema") {
        findings.push({
          path: filePath,
          severity: "error",
          message: `references[${index}]: schema ref ${ref.ref} resolves to type=${noteMeta?.type ?? "(none)"}, expected schema`,
        });
        return;
      }
      const pkg = typeof noteMeta.package === "string" ? noteMeta.package : null;
      const exp = typeof noteMeta.package_export === "string" ? noteMeta.package_export : null;
      if (!pkg || !exp) {
        findings.push({
          path: filePath,
          severity: "error",
          message: `references[${index}]: schema wiki-link ref requires the target note to declare both 'package' and 'package_export' (got package=${pkg ?? "(none)"}, package_export=${exp ?? "(none)"})`,
        });
      }
      return;
    }
    validatePathReference(ref.ref, index, filePath, contentRoot, findings, "content/schemas/", true);
    return;
  }
  if (ref.kind === "example") {
    validatePathReference(ref.ref, index, filePath, contentRoot, findings, "content/", false);
    return;
  }

  const expected = expectedTypes[ref.kind];
  if (!expected) return;
  const tp = resolveWikiLink(ref.ref, slugMap);
  if (!tp) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: ${ref.kind} ref ${ref.ref} did not resolve`,
    });
    return;
  }
  const targetType = metaByPath.get(tp)?.type;
  if (targetType !== expected) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: ${ref.kind} ref ${ref.ref} resolves to type=${targetType ?? "(none)"}, expected ${expected}`,
    });
  }
}

function validatePathReference(
  ref: string,
  index: number,
  filePath: string,
  contentRoot: string,
  findings: CrossFileFinding[],
  requiredPrefix: string,
  requireJson: boolean,
): void {
  if (WIKI_LINK_RE.test(ref)) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference must not be a wiki link: ${ref}`,
    });
    return;
  }
  if (!ref.startsWith(requiredPrefix)) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference must start with ${requiredPrefix}: ${ref}`,
    });
    return;
  }
  const repoRelativeAbs = path.resolve(process.cwd(), ref);
  const contentRelativeAbs = path.resolve(contentRoot, ref.replace(/^content\//, ""));
  const abs = existsSync(repoRelativeAbs) ? repoRelativeAbs : contentRelativeAbs;
  if (!existsSync(abs)) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference does not exist: ${ref}`,
    });
    return;
  }
  if (!statSync(abs).isFile()) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: path reference is not a file: ${ref}`,
    });
    return;
  }
  if (requireJson && !ref.endsWith(".schema.json")) {
    findings.push({
      path: filePath,
      severity: "error",
      message: `references[${index}]: schema reference must end with .schema.json: ${ref}`,
    });
  }
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
  // Inventory coverage warning: non-draft Molds should appear in at least one pipeline.
  const orphans: string[] = [];
  for (const f of files) {
    if (f.meta.type !== "mold") continue;
    if (f.meta.status === "draft") continue;
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

function validateMoldSourceLayout(contentRoot: string, moldFiles: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const moldsRoot = path.join(contentRoot, "molds");
  if (!existsSync(moldsRoot) || !statSync(moldsRoot).isDirectory()) return findings;

  const seenMoldDirs = new Set(moldFiles.map((f) => path.dirname(f.path)));
  for (const entry of readdirSync(moldsRoot).sort()) {
    const moldDir = path.join(moldsRoot, entry);
    if (!statSync(moldDir).isDirectory()) continue;
    const indexPath = path.join(moldDir, "index.md");
    const evalPath = path.join(moldDir, "eval.md");

    if (!existsSync(indexPath)) {
      findings.push({
        path: moldDir,
        severity: "error",
        message: "mold source directory must contain index.md",
      });
    } else if (!seenMoldDirs.has(moldDir)) {
      findings.push({
        path: indexPath,
        severity: "error",
        message: "mold source index.md must validate as type=mold",
      });
    }

    for (const mdPath of listMarkdownFiles(moldDir)) {
      if (path.basename(mdPath) === "index.md") continue;
      const parsed = readMarkdown(mdPath);
      if (parsed.hasFrontmatter) {
        findings.push({
          path: mdPath,
          severity: "error",
          message: "only mold index.md may have frontmatter",
        });
      }
    }

    if (!existsSync(evalPath)) {
      findings.push({
        path: moldDir,
        severity: "warning",
        message: "mold source directory should contain eval.md",
      });
      continue;
    }

    const evalBody = readMarkdown(evalPath).body;
    if (!/^##\s+Case:/m.test(evalBody)) {
      findings.push({
        path: evalPath,
        severity: "warning",
        message: "eval.md should declare at least one '## Case:' section",
      });
    }
    if (!/\b(deterministic|llm-judged)\b/.test(evalBody)) {
      findings.push({
        path: evalPath,
        severity: "warning",
        message: "eval.md should identify deterministic or llm-judged checks",
      });
    }
  }

  return findings;
}

function validateCliCommandDocs(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  const requiredSections = ["Install", "Synopsis", "Output", "Exit codes", "Examples", "Gotchas"];
  for (const f of files) {
    if (f.meta.type !== "cli-command") continue;
    const body = readMarkdown(f.path).body;
    for (const section of requiredSections) {
      if (new RegExp(`^##\\s+${section}\\b`, "m").test(body)) continue;
      findings.push({
        path: f.path,
        severity: "warning",
        message: `cli-command should include ## ${section}`,
      });
    }
  }
  return findings;
}

function validatePatternVerificationEvidence(files: FileMeta[]): CrossFileFinding[] {
  const findings: CrossFileFinding[] = [];
  for (const f of files) {
    if (f.meta.type === "pattern") {
      validatePatternVerificationPaths(f, findings);
      validatePatternIwcExemplars(f, findings);
    }
  }
  return findings;
}

const GENERATED_IWC_REF_RE = /(?:^|\/)(?:\$IWC_FORMAT2|\$IWC_SKELETONS|workflow-fixtures\/iwc-(?:format2|skeletons)|iwc-(?:format2|skeletons)\/)|\.(?:ga|gxwf\.ya?ml)$/;
const LINE_REF_RE = /:\d+(?:-\d+)?$/;

function validatePatternIwcExemplars(file: FileMeta, findings: CrossFileFinding[]): void {
  const exemplars = Array.isArray(file.meta.iwc_exemplars) ? file.meta.iwc_exemplars : [];
  if (file.meta.pattern_kind === "leaf" && exemplars.length === 0) {
    findings.push({
      path: file.path,
      severity: "warning",
      message: "leaf pattern should declare iwc_exemplars metadata",
    });
  }

  exemplars.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return;
    const exemplar = raw as Record<string, unknown>;
    if (typeof exemplar.workflow !== "string") return;
    const workflow = exemplar.workflow;
    if (GENERATED_IWC_REF_RE.test(workflow) || LINE_REF_RE.test(workflow)) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `iwc_exemplars[${index}].workflow must use an abstract IWC workflow ID, not a generated path or line citation: ${workflow}`,
      });
    }
  });
}

function validatePatternVerificationPaths(file: FileMeta, findings: CrossFileFinding[]): void {
  const verificationPaths = Array.isArray(file.meta.verification_paths) ? file.meta.verification_paths : [];
  for (const verificationPath of verificationPaths) {
    if (typeof verificationPath !== "string") continue;
    const abs = path.resolve(process.cwd(), verificationPath);
    if (!existsSync(abs)) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `verification_paths: file does not exist: ${verificationPath}`,
      });
    } else if (!statSync(abs).isFile()) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `verification_paths: path is not a file: ${verificationPath}`,
      });
    }
  }

  const evidence = file.meta.evidence;
  if (evidence === "structurally-verified" || evidence === "corpus-and-verified") {
    if (verificationPaths.length === 0) {
      findings.push({
        path: file.path,
        severity: "error",
        message: `evidence=${evidence} requires at least one verification path`,
      });
    }
  } else if ((evidence === "corpus-observed" || evidence === "hypothesis") && verificationPaths.length > 0) {
    findings.push({
      path: file.path,
      severity: "error",
      message: `evidence=${evidence} must not declare verification_paths`,
    });
  }
}

function listMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files.push(...listMarkdownFiles(full));
    else if (entry.endsWith(".md")) files.push(full);
  }
  return files;
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
  crossFindings.push(...validateMoldRefs(validFiles, slugMap, metaByPath, opts.directory));
  crossFindings.push(...validatePipelinePhases(validFiles, slugMap, metaByPath));
  crossFindings.push(...validateMoldSourceLayout(opts.directory, validFiles.filter((f) => f.meta.type === "mold")));
  crossFindings.push(...validateCliCommandDocs(validFiles));
  crossFindings.push(...validatePatternVerificationEvidence(validFiles));

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

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSchema, loadTags } from "../scripts/lib/schema.js";
import { validateData, validateDirectory } from "../scripts/validate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const SCHEMA_PATH = path.join(repoRoot, "meta_schema.yml");
const TAGS_PATH = path.join(repoRoot, "meta_tags.yml");

function loadRealSchema() {
  return loadSchema(SCHEMA_PATH, loadTags(TAGS_PATH));
}

const baseRequired = (overrides: Record<string, unknown> = {}) => ({
  type: "pattern",
  tags: ["pattern"],
  status: "draft",
  created: "2026-04-30",
  revised: "2026-04-30",
  revision: 1,
  ai_generated: false,
  summary: "A short summary that meets the minimum length requirement.",
  title: "Test Pattern",
  ...overrides,
});

const patternRequired = (overrides: Record<string, unknown> = {}) => baseRequired({
  pattern_kind: "leaf",
  ...overrides,
});

describe("validateData (per-file)", () => {
  const schema = loadRealSchema();

  it("accepts a minimal pattern", () => {
    const r = validateData(patternRequired(), schema);
    expect(r.errors).toEqual([]);
  });

  it("rejects missing required fields", () => {
    const r = validateData({ type: "pattern" }, schema);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown fields", () => {
    const r = validateData(patternRequired({ bogus: "x" }), schema);
    expect(r.errors.some((e) => /bogus/.test(e))).toBe(true);
  });

  it("rejects pipeline missing phases", () => {
    const r = validateData(
      baseRequired({ type: "pipeline", tags: ["pipeline"], title: "X" }),
      schema,
    );
    expect(r.errors.some((e) => /phases/.test(e))).toBe(true);
  });

  it("accepts pipeline with phases array", () => {
    const r = validateData(
      baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "X",
        phases: [{ mold: "[[summarize-paper]]" }],
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("rejects mold missing axis", () => {
    const r = validateData(
      baseRequired({ type: "mold", tags: ["mold"], name: "x" }),
      schema,
    );
    expect(r.errors.some((e) => /axis/.test(e))).toBe(true);
  });

  it("source-specific mold requires source", () => {
    const r = validateData(
      baseRequired({ type: "mold", tags: ["mold"], name: "x", axis: "source-specific" }),
      schema,
    );
    expect(r.errors.some((e) => /source/.test(e))).toBe(true);
  });

  it("accepts typed references metadata", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "condense",
            evidence: "hypothesis",
            purpose: "Explain when to load this reference.",
            trigger: "When the runtime task needs component details.",
            verification: "Run the generated skill on a real fixture and confirm this reference helps.",
          },
        ],
      }),
      schema,
    );
    expect(r.errors).toEqual([]);
  });

  it("rejects unknown typed reference fields", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
            evidence: "corpus-observed",
            bogus: "x",
          },
        ],
      }),
      schema,
    );
    expect(r.errors.some((e) => /bogus/.test(e))).toBe(true);
  });

  it("requires evidence on typed references", () => {
    const r = validateData(
      baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "x",
        axis: "generic",
        references: [
          {
            kind: "research",
            ref: "[[component-x]]",
            used_at: "runtime",
            load: "on-demand",
            mode: "verbatim",
          },
        ],
      }),
      schema,
    );
    expect(r.errors.some((e) => /evidence/.test(e))).toBe(true);
  });

  it("rejects bad date format", () => {
    const r = validateData(patternRequired({ created: "not-a-date" }), schema);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("rejects whitespace-only wiki link", () => {
    const r = validateData(patternRequired({ parent_pattern: "[[   ]]" }), schema);
    expect(r.errors.some((e) => /whitespace-only/.test(e))).toBe(true);
  });

  it("warns on tag coherence drift", () => {
    const r = validateData(patternRequired({ tags: ["mold"] }), schema);
    expect(r.warnings.some((w) => /expected 'pattern'/.test(w))).toBe(true);
  });
});

// ---- Cross-file integration ----

function writeFm(file: string, fm: Record<string, unknown>): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const yaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  writeFileSync(file, `---\n${yaml}\n---\n\nbody\n`);
}

describe("validateDirectory (cross-file)", () => {
  let dir: string;

  beforeEach((ctx) => {
    const safe = ctx.task.name.replace(/[^a-z0-9]+/gi, "-");
    dir = path.join(repoRoot, `.tmp-test-vault-${safe}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("validates a tiny vault end-to-end", () => {

    writeFm(path.join(dir, "patterns/foo.md"), patternRequired());

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.filesChecked).toBe(1);
  });

  it("flags pipeline phase resolving to non-Mold", () => {
    // Pipeline references [[some-pattern]], but the file is a pattern, not a mold.
    writeFm(path.join(dir, "pipelines/p.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "P",
        phases: [{ mold: "[[some-pattern]]" }],
      }),
    });
    writeFm(path.join(dir, "patterns/some-pattern.md"), {
      ...patternRequired({ type: "pattern", tags: ["pattern"], title: "Some Pattern" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("resolves a pipeline's [branch] phase to molds", () => {
    writeFm(path.join(dir, "pipelines/p.md"), {
      ...baseRequired({
        type: "pipeline",
        tags: ["pipeline"],
        title: "P",
        phases: [
          {
            branch: "discover-or-author",
            branches: ["[[discover]]", { fallthrough: "[[author]]" }],
          },
        ],
      }),
    });
    writeFm(path.join(dir, "molds/discover/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "discover",
        axis: "generic",
        status: "reviewed",
      }),
    });
    writeFm(path.join(dir, "molds/author/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "author",
        axis: "generic",
        status: "reviewed",
      }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("validates typed reference targets", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          { kind: "research", ref: "[[component-x]]", used_at: "runtime", load: "on-demand", mode: "verbatim", evidence: "corpus-observed" },
          { kind: "pattern", ref: "[[pattern-x]]", used_at: "cast-time", load: "upfront", mode: "condense", evidence: "corpus-observed" },
          { kind: "schema", ref: "content/schemas/x.schema.json", used_at: "both", load: "upfront", mode: "verbatim", evidence: "cast-validated" },
        ],
      }),
    });
    writeFm(path.join(dir, "research/component-x.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });
    writeFm(path.join(dir, "patterns/pattern-x.md"), {
      ...patternRequired({ type: "pattern", tags: ["pattern"], title: "Pattern X" }),
    });
    mkdirSync(path.join(dir, "schemas"), { recursive: true });
    writeFileSync(path.join(dir, "schemas/x.schema.json"), "{}");

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("resolves CLI command references by tool and command", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          { kind: "cli-command", ref: "[[gxwf validate]]", used_at: "runtime", load: "on-demand", mode: "sidecar", evidence: "corpus-observed", trigger: "After editing a Galaxy workflow." },
        ],
      }),
    });
    writeFm(path.join(dir, "cli/gxwf/validate.md"), {
      ...baseRequired({ type: "cli-command", tags: ["cli-command", "cli/gxwf"], tool: "gxwf", command: "validate" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });

  it("rejects typed references that resolve to the wrong type", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          { kind: "research", ref: "[[not-research]]", used_at: "runtime", load: "on-demand", mode: "verbatim", evidence: "corpus-observed" },
        ],
      }),
    });
    writeFm(path.join(dir, "patterns/not-research.md"), {
      ...patternRequired({ type: "pattern", tags: ["pattern"], title: "Not Research" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("requires verification for hypothesis references", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          { kind: "research", ref: "[[component-x]]", used_at: "runtime", load: "on-demand", mode: "verbatim", evidence: "hypothesis" },
        ],
      }),
    });
    writeFm(path.join(dir, "research/component-x.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });

  it("warns when on-demand references omit triggers", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
        references: [
          { kind: "research", ref: "[[component-x]]", used_at: "runtime", load: "on-demand", mode: "verbatim", evidence: "corpus-observed" },
        ],
      }),
    });
    writeFm(path.join(dir, "research/component-x.md"), {
      ...baseRequired({ type: "research", tags: ["research/component"], subtype: "component" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("flags Mold source layout drift", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFm(path.join(dir, "molds/m/notes.md"), {
      ...patternRequired({ title: "Unexpected Note" }),
    });

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBeGreaterThanOrEqual(1);
    expect(r.warnings).toBeGreaterThanOrEqual(1);
  });

  it("accepts a Mold eval plan without frontmatter", () => {
    writeFm(path.join(dir, "molds/m/index.md"), {
      ...baseRequired({
        type: "mold",
        tags: ["mold"],
        name: "m",
        axis: "generic",
      }),
    });
    writeFileSync(
      path.join(dir, "molds/m/eval.md"),
      "# m eval\n\n## Case: basic\n\n- check: deterministic\n- fixture: synthetic\n",
    );

    const r = validateDirectory({
      directory: dir,
      schemaPath: SCHEMA_PATH,
      tagsPath: TAGS_PATH,
    });
    expect(r.errors).toBe(0);
  });
});

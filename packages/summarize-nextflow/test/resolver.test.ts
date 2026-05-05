import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { buildSummary } from "../src/index.js";

interface SummaryLike {
  processes: {
    name: string;
    module_path: string;
    meta: {
      description?: string;
      keywords: string[];
      authors: string[];
      tools: { name: string; description?: string; homepage?: string; licence?: string[] }[];
      input: { name: string; type?: string; description?: string; pattern?: string }[];
      output: { name: string; type?: string; description?: string; pattern?: string }[];
    } | null;
    module_tests: {
      name: string;
      path: string;
      snapshot: {
        snap_path: string | null;
        parsed_content?: {
          name: string;
          channels: {
            key: string | null;
            files: { path: string; basename: string; md5: string; stub: boolean }[];
            values: unknown[];
          }[];
        }[];
      } | null;
    }[];
    inputs: unknown[];
    outputs: unknown[];
  }[];
  subworkflows: { name: string; path: string; tests: { name: string; path: string }[] }[];
  warnings: string[];
}

const roots: string[] = [];

afterEach(() => {
  roots.length = 0;
});

describe("resolveNextflowSummary", () => {
  test("discovers multiple processes in a single root-level module file", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/callings' }\n");
    write(
      root,
      "modules.nf",
      `process FIRST {
  input:
  path reads
  output:
  path "first.txt", emit: first
  script:
  "first"
}

process SECOND {
  input:
  val sample
  output:
  path "second.txt", emit: second
  script:
  "second"
}
`,
    );
    write(root, "main.nf", "workflow { FIRST(Channel.of('x')); SECOND('sample') }\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual(["FIRST", "SECOND"]);
    expect(summary.processes.every((process) => process.module_path === "modules.nf")).toBe(true);
    expect(summary.processes[0]?.inputs).toHaveLength(1);
    expect(summary.processes[1]?.outputs).toHaveLength(1);
  });

  test("discovers flat module files that are not named main.nf", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/flat' }\n");
    write(root, "modules/align.nf", "process ALIGN {\n  script:\n  'align'\n}\n");
    write(root, "modules/qc.nf", "process QC {\n  script:\n  'qc'\n}\n");
    write(root, "main.nf", "workflow { ALIGN(); QC() }\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual(["ALIGN", "QC"]);
    expect(summary.processes.map((process) => process.module_path)).toEqual([
      "modules/align.nf",
      "modules/qc.nf",
    ]);
  });

  test("discovers inline, workflow, and lib process blocks", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/spread' }\n");
    write(root, "main.nf", "process INLINE {\n  script:\n  'inline'\n}\nworkflow { INLINE() }\n");
    write(root, "workflows/assemble.nf", "process ASSEMBLE {\n  script:\n  'assemble'\n}\n");
    write(root, "lib/annotate.nf", "process ANNOTATE {\n  script:\n  'annotate'\n}\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual([
      "ANNOTATE",
      "INLINE",
      "ASSEMBLE",
    ]);
    expect(summary.processes.map((process) => process.module_path)).toEqual([
      "lib/annotate.nf",
      "main.nf",
      "workflows/assemble.nf",
    ]);
  });

  test("skips known vendored and generated directories", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'adhoc/vendor-skip' }\n");
    write(root, "main.nf", "process REAL {\n  script:\n  'real'\n}\nworkflow { REAL() }\n");
    write(root, "external-modules/noise.nf", "process VENDORED {\n  script:\n  'vendored'\n}\n");
    write(root, "work/noise.nf", "process WORKDIR {\n  script:\n  'workdir'\n}\n");

    const summary = await summarize(root);

    expect(summary.processes.map((process) => process.name)).toEqual(["REAL"]);
  });

  test("auto-detects a child pipeline root with nextflow.config", async () => {
    const repo = tempPipelineRoot();
    write(repo, "mop_preprocess/nextflow.config", "manifest { name = 'adhoc/mop_preprocess' }\n");
    write(
      repo,
      "mop_preprocess/local_modules.nf",
      "process BASECALL {\n  script:\n  'basecall'\n}\n",
    );
    write(repo, "mop_preprocess/main.nf", "workflow { BASECALL() }\n");

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["BASECALL"]);
    expect(summary.warnings).toContain("auto-detected Nextflow pipeline root: mop_preprocess");
  });

  test("surfaces ambiguous child pipeline roots", async () => {
    const repo = tempPipelineRoot();
    write(repo, "mop_mod/nextflow.config", "manifest { name = 'adhoc/mop_mod' }\n");
    write(repo, "mop_mod/main.nf", "workflow { MOD() }\nprocess MOD {\n  script:\n  'mod'\n}\n");
    write(repo, "mop_preprocess/nextflow.config", "manifest { name = 'adhoc/mop_preprocess' }\n");
    write(
      repo,
      "mop_preprocess/main.nf",
      "workflow { PREPROCESS() }\nprocess PREPROCESS {\n  script:\n  'preprocess'\n}\n",
    );

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["MOD"]);
    expect(summary.warnings).toContain("multiple Nextflow pipeline roots found; selected mop_mod");
  });

  test("keeps monorepo root when child configs share root-level process files", async () => {
    const repo = tempPipelineRoot();
    write(repo, "local_modules.nf", "process SHARED {\n  script:\n  'shared'\n}\n");
    write(repo, "mop_mod/nextflow.config", "manifest { name = 'adhoc/mop_mod' }\n");
    write(repo, "mop_mod/mop_mod.nf", "workflow { SHARED() }\n");
    write(repo, "mop_preprocess/nextflow.config", "manifest { name = 'adhoc/mop_preprocess' }\n");
    write(repo, "mop_preprocess/mop_preprocess.nf", "workflow { SHARED() }\n");

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["SHARED"]);
    expect(summary.processes.map((process) => process.module_path)).toEqual(["local_modules.nf"]);
    expect(summary.warnings).toContain(
      "detected child Nextflow configs but kept repository root because shared process files exist outside child roots",
    );
  });

  test("auto-detects a source directory from a workflow block without config", async () => {
    const repo = tempPipelineRoot();
    write(repo, "nf/phage.nf", "workflow { PHAGE() }\n");
    write(repo, "nf/modules/phage.nf", "process PHAGE {\n  script:\n  'phage'\n}\n");

    const summary = await summarize(repo);

    expect(summary.processes.map((process) => process.name)).toEqual(["PHAGE"]);
    expect(summary.warnings).toContain(
      "auto-detected Nextflow pipeline root from workflow block: nf",
    );
    expect(summary.warnings).toContain("selected Nextflow entrypoint: phage.nf");
  });

  test("prefers shallow anonymous workflow entrypoints over nested named workflows", async () => {
    const repo = tempPipelineRoot();
    write(repo, "nf/ui.nf", "workflow { UI() }\n");
    write(repo, "nf/subworkflows/nested/main.nf", "workflow NESTED { UI() }\n");
    write(repo, "nf/modules/ui.nf", "process UI {\n  script:\n  'ui'\n}\n");

    const summary = await summarize(repo);

    expect(summary.warnings).toContain(
      "auto-detected Nextflow pipeline root from workflow block: nf",
    );
    expect(summary.warnings).toContain("selected Nextflow entrypoint: ui.nf");
  });

  test("captures module meta.yml and module nf-tests on canonical process", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/module-meta' }\n");
    write(
      root,
      "main.nf",
      "include { ALIGN } from './modules/nf-core/minimap2/align'\nworkflow MODULE_META { ALIGN() }\n",
    );
    write(
      root,
      "modules/nf-core/minimap2/align/main.nf",
      "process ALIGN {\n  script:\n  'align'\n}\n",
    );
    write(
      root,
      "modules/nf-core/minimap2/align/meta.yml",
      `description: Align reads against a reference
keywords:
  - align
  - reference
authors:
  - "@author"
maintainers:
  - "@maintainer"
tools:
  - minimap2:
      description: Fast sequence aligner
      homepage: https://github.com/lh3/minimap2
      licence:
        - MIT
input:
  - reads:
      type: file
      description: Input reads
      pattern: "*.fastq.gz"
output:
  - bam:
      type: file
      description: Aligned reads
      pattern: "*.bam"
`,
    );
    write(
      root,
      "modules/nf-core/minimap2/align/tests/main.nf.test",
      `profile "test"
test("align module") {
  when { params { outdir = "results" } }
  then { assert snapshot(workflow.trace.succeeded().size()).match() }
}
`,
    );
    write(
      root,
      "modules/nf-core/minimap2/align/tests/main.nf.test.snap",
      JSON.stringify({
        "align module": {
          content: [
            {
              "0": ["aligned.bam:md5,aa8b2aa1e0b5fbbba3b04d471e1b0535"],
              versions: [["MINIMAP2", "minimap2", "2.28"]],
              bam: [["sample1", "results/aligned.bam:md5,d41d8cd98f00b204e9800998ecf8427e"]],
            },
          ],
          meta: { "nf-test": "0.9.3" },
        },
        "sibling module": {
          content: [{ bam: ["sibling.bam:md5,ffffffffffffffffffffffffffffffff"] }],
        },
      }),
    );

    const summary = await summarize(root);
    const process = summary.processes[0]!;

    expect(process.meta?.description).toBe("Align reads against a reference");
    expect(process.meta?.keywords).toEqual(["align", "reference"]);
    expect(process.meta?.authors).toEqual(["@author"]);
    expect(process.meta?.tools[0]).toEqual(
      expect.objectContaining({
        name: "minimap2",
        description: "Fast sequence aligner",
        homepage: "https://github.com/lh3/minimap2",
        licence: ["MIT"],
      }),
    );
    expect(process.meta?.input[0]).toEqual(
      expect.objectContaining({ name: "reads", type: "file", pattern: "*.fastq.gz" }),
    );
    expect(process.module_tests).toHaveLength(1);
    expect(process.module_tests[0]).toEqual(
      expect.objectContaining({
        name: "align module",
        path: "modules/nf-core/minimap2/align/tests/main.nf.test",
        snapshot: expect.objectContaining({
          snap_path: "modules/nf-core/minimap2/align/tests/main.nf.test.snap",
          parsed_content: [
            {
              name: "align module",
              channels: [
                {
                  key: "0",
                  files: [
                    {
                      path: "aligned.bam",
                      basename: "aligned.bam",
                      md5: "aa8b2aa1e0b5fbbba3b04d471e1b0535",
                      stub: false,
                    },
                  ],
                  values: [],
                },
                {
                  key: "versions",
                  files: [],
                  values: [["MINIMAP2", "minimap2", "2.28"]],
                },
                {
                  key: "bam",
                  files: [
                    {
                      path: "results/aligned.bam",
                      basename: "aligned.bam",
                      md5: "d41d8cd98f00b204e9800998ecf8427e",
                      stub: true,
                    },
                  ],
                  values: ["sample1"],
                },
              ],
            },
          ],
        }),
      }),
    );
  });

  test("captures subworkflow tests and leaves local process module metadata empty", async () => {
    const root = tempPipelineRoot();
    write(root, "nextflow.config", "manifest { name = 'nf-core/subworkflow-tests' }\n");
    write(root, "modules/local/local.nf", "process LOCAL {\n  script:\n  'local'\n}\n");
    write(root, "modules/local/meta.yml", "description: Local metadata should not be promoted\n");
    write(
      root,
      "modules/local/tests/local.nf.test",
      'test("local") { then { assert workflow.success } }\n',
    );
    write(root, "modules/local/other.nf", "process OTHER {\n  script:\n  'other'\n}\n");
    write(
      root,
      "subworkflows/nf-core/trim/main.nf",
      "workflow TRIM {\n  take:\n  reads\n  main:\n  LOCAL(reads)\n}\n",
    );
    write(
      root,
      "workflows/pipeline.nf",
      "workflow PIPELINE {\n  take:\n  reads\n  main:\n  LOCAL(reads)\n  OTHER(reads)\n}\n",
    );
    write(
      root,
      "main.nf",
      "include { LOCAL } from './modules/local/local'\ninclude { OTHER } from './modules/local/other'\ninclude { TRIM } from './subworkflows/nf-core/trim'\ninclude { PIPELINE } from './workflows/pipeline'\nworkflow { PIPELINE(Channel.of('x')) }\n",
    );
    write(
      root,
      "subworkflows/nf-core/trim/tests/main.nf.test",
      `test("trim subworkflow") {
  then { assert workflow.success }
}
`,
    );

    const summary = await summarize(root);

    expect(summary.processes.every((process) => process.meta === null)).toBe(true);
    expect(summary.processes.every((process) => process.module_tests.length === 0)).toBe(true);
    expect(summary.subworkflows.find((workflow) => workflow.name === "TRIM")?.tests).toEqual([
      expect.objectContaining({
        name: "trim subworkflow",
        path: "subworkflows/nf-core/trim/tests/main.nf.test",
      }),
    ]);
  });
});

async function summarize(root: string): Promise<SummaryLike> {
  return (await buildSummary(root, {
    profile: "test",
    withNextflow: false,
    fetchTestData: false,
    validate: false,
  })) as SummaryLike;
}

function tempPipelineRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "summarize-nextflow-"));
  roots.push(root);
  return root;
}

function write(root: string, path: string, content: string): void {
  const target = join(root, path);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
}

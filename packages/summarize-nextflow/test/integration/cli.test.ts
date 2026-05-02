// Integration tests against real cast artifacts and real pipeline trees.
// Skips gracefully when the workflow-fixtures repo isn't present locally.

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { isAbsolute, join, relative as relativePath, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSummary } from "@galaxy-foundry/summary-nextflow-schema";

const PKG_ROOT = resolve(__dirname, "..", "..");
const FOUNDRY_ROOT = resolve(PKG_ROOT, "..", "..");
const CLI = resolve(PKG_ROOT, "dist/bin/summarize-nextflow.js");
const FIXTURES = resolve(os.homedir(), "projects/repositories/workflow-fixtures/pipelines");
const DEMO_PIPELINE = resolve(FIXTURES, "nf-core__demo");
const BACASS_PIPELINE = resolve(FIXTURES, "nf-core__bacass");
const DEMO_SUMMARY = resolve(
  FOUNDRY_ROOT,
  "casts/claude/summarize-nextflow/runs/nf-core__demo/summary.json",
);

function cliBuilt(): boolean {
  return existsSync(CLI);
}

function fixturePresent(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

const itIfBuilt = cliBuilt() ? it : it.skip;
const itIfDemoFixture = cliBuilt() && fixturePresent(DEMO_PIPELINE) ? it : it.skip;
const itIfBacassFixture = cliBuilt() && fixturePresent(BACASS_PIPELINE) ? it : it.skip;

describe("summarize-nextflow CLI — built bin", () => {
  itIfBuilt("--version emits a semver", () => {
    const r = spawnSync("node", [CLI, "--version"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  itIfBuilt("--help mentions the planned flags", () => {
    const r = spawnSync("node", [CLI, "--help"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--profile");
    expect(r.stdout).toContain("--no-with-nextflow");
    expect(r.stdout).toContain("--fetch-test-data");
    expect(r.stdout).toContain("--test-data-dir");
    expect(r.stdout).toContain("--no-validate");
  });

  itIfBuilt("resolves inherited test-data params and localizes fetched files", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    mkdirSync(join(root, "conf"));
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
params {
  pipelines_testdata_base_path = 'https://example.test/data/'
  reference_fasta = params.pipelines_testdata_base_path + 'ref.fa'
}
profiles { test {} }
`,
    );
    writeFileSync(
      join(root, "conf", "test.config"),
      `params {
  input = params.pipelines_testdata_base_path + 'samplesheet.csv'
}
`,
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const href = String(url);
      if (href.endsWith("samplesheet.csv")) {
        return new Response("sample,reads\none,https://example.test/data/reads.fastq.gz\n");
      }
      if (href.endsWith("ref.fa")) return new Response(">chr1\nACGT\n");
      if (href.endsWith("reads.fastq.gz")) return new Response("reads");
      return new Response("missing", { status: 404, statusText: "Not Found" });
    }) as typeof fetch;

    try {
      const { buildSummary } = (await import("../../dist/index.js")) as {
        buildSummary: typeof import("../../src/index.js").buildSummary;
      };
      const summary = await buildSummary(root, {
        profile: "test",
        withNextflow: false,
        fetchTestData: true,
        testDataDir: relativePath(process.cwd(), join(root, "localized-test-data")),
        validate: false,
      });
      const validation = validateSummary(summary);
      expect(validation.valid).toBe(true);

      const inputs = (summary as { test_fixtures: { inputs: { role: string; path: string }[] } })
        .test_fixtures.inputs;
      expect(inputs.map((input) => input.role)).toEqual(
        expect.arrayContaining(["samplesheet", "reference_fasta", "reads"]),
      );
      expect(inputs.every((input) => isAbsolute(input.path))).toBe(true);
      expect(inputs.every((input) => existsSync(input.path))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  itIfBuilt("extracts all bioconda dependencies from module environments", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    const moduleDir = join(root, "modules", "local", "align");
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} }
`,
    );
    writeFileSync(
      join(moduleDir, "main.nf"),
      `process MINIMAP2_ALIGN {
  conda "\${moduleDir}/environment.yml"
  input:
  path reads
  output:
  path "*.bam", emit: bam
  script:
  """
  minimap2 | samtools sort
  """
}
`,
    );
    writeFileSync(
      join(moduleDir, "environment.yml"),
      `name: synthetic
dependencies:
  - bioconda::minimap2=2.24
  - bioconda::samtools=1.18
  - bioconda::htslib=1.18
  - conda-forge::pigz=2.6
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const tools = (summary as { tools: { name: string; version: string; bioconda: string }[] })
      .tools;
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["minimap2", "samtools", "htslib"]),
    );
    expect(tools.find((tool) => tool.name === "htslib")?.bioconda).toBe("bioconda::htslib=1.18");
    expect(tools.some((tool) => tool.name === "pigz")).toBe(false);
  });

  itIfBuilt("extracts process aliases from include statements", async () => {
    const root = mkdtempSync(join(os.tmpdir(), "foundry-synthetic-nextflow-"));
    const moduleDir = join(root, "modules", "local", "align");
    mkdirSync(join(root, "workflows"), { recursive: true });
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(
      join(root, "nextflow.config"),
      `manifest { name = 'nf-core/synthetic' }
profiles { test {} }
`,
    );
    writeFileSync(
      join(root, "workflows", "synthetic.nf"),
      `include { MINIMAP2_ALIGN as MINIMAP2_CONSENSUS } from '../modules/local/align'
include { MINIMAP2_ALIGN as MINIMAP2_POLISH } from '../modules/local/align'
include { FASTQC } from '../modules/local/fastqc'
`,
    );
    writeFileSync(
      join(moduleDir, "main.nf"),
      `process MINIMAP2_ALIGN {
  output:
  path "*.paf", emit: paf
  script:
  """
  minimap2
  """
}
`,
    );

    const { buildSummary } = (await import("../../dist/index.js")) as {
      buildSummary: typeof import("../../src/index.js").buildSummary;
    };
    const summary = await buildSummary(root, {
      profile: "test",
      withNextflow: false,
      fetchTestData: false,
      validate: false,
    });
    const validation = validateSummary(summary);
    expect(validation.valid).toBe(true);

    const process = (
      summary as { processes: { name: string; aliases: string[] }[] }
    ).processes.find((candidate) => candidate.name === "MINIMAP2_ALIGN");
    expect(process?.aliases).toEqual(["MINIMAP2_CONSENSUS", "MINIMAP2_POLISH"]);
  });
});

describe("summarize-nextflow CLI — real pipeline tree (nf-core/demo)", () => {
  itIfDemoFixture("emits valid JSON summary for the demo fixture", () => {
    const r = spawnSync("node", [CLI, DEMO_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const validation = validateSummary(data);
    expect(validation.valid).toBe(true);
    expect(data.source.workflow).toBe("demo");
    expect(data.profiles).toContain("test");
    expect(data.processes.map((p: { name: string }) => p.name)).toEqual(
      expect.arrayContaining(["FASTQC", "SEQTK_TRIM", "MULTIQC"]),
    );
    expect(data.tools.map((t: { name: string }) => t.name)).toEqual(
      expect.arrayContaining(["fastqc", "seqtk", "multiqc"]),
    );
    expect(data.test_fixtures.inputs[0].url).toContain("samplesheet_test_illumina_amplicon.csv");
    expect(data.nf_tests[0].profiles).toContain("test");
  });

  itIfDemoFixture("uses nextflow inspect by default when available", () => {
    const binDir = mkdtempSync(join(os.tmpdir(), "foundry-nextflow-bin-"));
    const fakeNextflow = join(binDir, "nextflow");
    writeFileSync(
      fakeNextflow,
      `#!/bin/sh\nprintf '%s\n' '{"processes":[{"name":"FASTQC","container":"quay.io/example/fastqc:inspect"}]}'\n`,
    );
    chmodSync(fakeNextflow, 0o755);

    const r = spawnSync("node", [CLI, DEMO_PIPELINE, "--no-validate"], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${binDir}${process.env.PATH ? `:${process.env.PATH}` : ""}` },
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const fastqc = data.processes.find((p: { name: string }) => p.name === "FASTQC");
    expect(fastqc.container).toBe("quay.io/example/fastqc:inspect");
  });

  itIfDemoFixture("fetches samplesheet-referenced test data when requested", () => {
    const r = spawnSync(
      "node",
      [CLI, DEMO_PIPELINE, "--no-with-nextflow", "--fetch-test-data", "--no-validate"],
      { encoding: "utf8", timeout: 120_000 },
    );
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const inputs = data.test_fixtures.inputs as {
      role: string;
      url: string;
      sha1: string;
      filetype: string;
    }[];
    const urls = inputs.map((input) => input.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(inputs.find((input) => input.role === "samplesheet")?.sha1).toMatch(/^[a-f0-9]{40}$/u);
    expect(inputs.filter((input) => input.role === "reads").length).toBe(4);
    expect(inputs.filter((input) => input.role === "reads").map((input) => input.filetype)).toEqual(
      ["fastq.gz", "fastq.gz", "fastq.gz", "fastq.gz"],
    );
    expect(
      inputs
        .filter((input) => input.role === "reads")
        .every((input) => /^[a-f0-9]{40}$/u.test(input.sha1)),
    ).toBe(true);
  });
});

describe("summarize-nextflow CLI — real pipeline tree (nf-core/bacass)", () => {
  itIfBacassFixture("resolves bacass profile test data expressions", () => {
    const dataDir = mkdtempSync(join(os.tmpdir(), "foundry-bacass-test-data-"));
    const r = spawnSync(
      "node",
      [
        CLI,
        BACASS_PIPELINE,
        "--profile",
        "test_liftoff",
        "--no-with-nextflow",
        "--fetch-test-data",
        "--test-data-dir",
        dataDir,
        "--no-validate",
      ],
      { encoding: "utf8", timeout: 120_000 },
    );
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const validation = validateSummary(data);
    expect(validation.valid).toBe(true);
    expect(data.source.workflow).toBe("bacass");
    expect(data.nf_tests.length).toBeGreaterThanOrEqual(9);

    const inputs = data.test_fixtures.inputs as {
      role: string;
      path: string;
      url: string;
      sha1: string;
    }[];
    expect(inputs.map((input) => input.role)).toEqual(
      expect.arrayContaining(["samplesheet", "reference_fasta", "reference_gff", "reads"]),
    );
    expect(inputs.every((input) => input.path.startsWith(dataDir))).toBe(true);
    expect(inputs.every((input) => existsSync(input.path))).toBe(true);
    expect(inputs.every((input) => /^[a-f0-9]{40}$/u.test(input.sha1))).toBe(true);
    expect(inputs.find((input) => input.role === "samplesheet")?.url).toBe(
      "https://raw.githubusercontent.com/nf-core/test-datasets/refs/heads/bacass/bacass_short.tsv",
    );
  });

  itIfBacassFixture("extracts multi-dependency bioconda tools from bacass modules", () => {
    const r = spawnSync("node", [CLI, BACASS_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const validation = validateSummary(data);
    expect(validation.valid).toBe(true);
    expect(data.tools.map((tool: { name: string }) => tool.name)).toEqual(
      expect.arrayContaining(["samtools", "htslib", "minimap2", "multiqc", "racon"]),
    );
    expect(data.tools.find((tool: { name: string }) => tool.name === "htslib")?.bioconda).toMatch(
      /^bioconda::htslib=/u,
    );
  });

  itIfBacassFixture("extracts repeated module aliases from bacass includes", () => {
    const r = spawnSync("node", [CLI, BACASS_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);

    const data = JSON.parse(r.stdout);
    const minimap2 = data.processes.find(
      (process: { name: string }) => process.name === "MINIMAP2_ALIGN",
    );
    const fastqc = data.processes.find((process: { name: string }) => process.name === "FASTQC");
    expect(minimap2.aliases).toEqual(["MINIMAP2_CONSENSUS", "MINIMAP2_POLISH"]);
    expect(fastqc.aliases).toEqual(["FASTQC_RAW", "FASTQC_TRIM"]);
  });
});

describe("real cast artifact: nf-core/demo summary.json", () => {
  it("exists in the cast bundle", () => {
    expect(existsSync(DEMO_SUMMARY)).toBe(true);
  });

  it("is valid JSON with the expected top-level keys", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    expect(data.source).toBeDefined();
    expect(data.source.workflow).toBe("demo");
    expect(Array.isArray(data.processes)).toBe(true);
    expect(data.processes.length).toBeGreaterThan(0);
  });
});

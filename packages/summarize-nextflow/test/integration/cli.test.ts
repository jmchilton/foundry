// Integration tests against real cast artifacts and real pipeline trees.
// Skips gracefully when the workflow-fixtures repo isn't present locally.

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSummary } from "@galaxy-foundry/summary-nextflow-schema";

const PKG_ROOT = resolve(__dirname, "..", "..");
const FOUNDRY_ROOT = resolve(PKG_ROOT, "..", "..");
const CLI = resolve(PKG_ROOT, "dist/bin/summarize-nextflow.js");
const FIXTURES = resolve(os.homedir(), "projects/repositories/workflow-fixtures/pipelines");
const DEMO_PIPELINE = resolve(FIXTURES, "nf-core__demo");
const DEMO_SUMMARY = resolve(
  FOUNDRY_ROOT,
  "casts/claude/summarize-nextflow/runs/nf-core__demo/summary.json",
);

function cliBuilt(): boolean {
  return existsSync(CLI);
}

function fixturesPresent(): boolean {
  try {
    return statSync(DEMO_PIPELINE).isDirectory();
  } catch {
    return false;
  }
}

const itIfBuilt = cliBuilt() ? it : it.skip;
const itIfFixtures = cliBuilt() && fixturesPresent() ? it : it.skip;

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
    expect(r.stdout).toContain("--no-validate");
  });
});

describe("summarize-nextflow CLI — real pipeline tree (nf-core/demo)", () => {
  itIfFixtures("emits valid JSON summary for the demo fixture", () => {
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

  itIfFixtures("uses nextflow inspect by default when available", () => {
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

  itIfFixtures("fetches samplesheet-referenced test data when requested", () => {
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

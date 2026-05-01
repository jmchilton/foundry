// Integration tests against real cast artifacts and real pipeline trees.
// Skips gracefully when the workflow-fixtures repo isn't present locally.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
  itIfFixtures("rejects gracefully against the demo fixture (not yet implemented)", () => {
    // Until the resolver is implemented the CLI exits 64.
    // When `build` lands, this test should be promoted: run the CLI, parse stdout
    // as JSON, validate against the schema, and assert key fields land.
    const r = spawnSync("node", [CLI, DEMO_PIPELINE, "--no-with-nextflow", "--no-validate"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(64);
    expect(r.stderr).toContain("not yet implemented");
    expect(r.stderr).toContain(DEMO_PIPELINE);
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

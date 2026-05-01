import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { summaryNextflowSchema, validateSummary } from "../src/index.js";

const FOUNDRY_ROOT = resolve(__dirname, "..", "..", "..");
const DEMO_SUMMARY = resolve(
  FOUNDRY_ROOT,
  "casts/claude/summarize-nextflow/runs/nf-core__demo/summary.json",
);
const BACASS_SUMMARY = resolve(
  FOUNDRY_ROOT,
  "casts/claude/summarize-nextflow/runs/nf-core__bacass/summary.json",
);

describe("summaryNextflowSchema", () => {
  it("is a JSON Schema with $schema", () => {
    expect(summaryNextflowSchema).toBeDefined();
    expect((summaryNextflowSchema as { $schema?: string }).$schema).toMatch(/json-schema\.org/);
  });
});

describe("validateSummary", () => {
  it("validates the nf-core/demo cast artifact", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    const result = validateSummary(data);
    if (!result.valid) {
      console.error("demo errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validates the nf-core/bacass cast artifact", () => {
    const data = JSON.parse(readFileSync(BACASS_SUMMARY, "utf8"));
    const result = validateSummary(data);
    if (!result.valid) {
      console.error("bacass errors:", result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an empty object", () => {
    const result = validateSummary({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a summary with an unknown top-level field", () => {
    const data = JSON.parse(readFileSync(DEMO_SUMMARY, "utf8"));
    data.bogusFieldThatShouldNotExist = true;
    const result = validateSummary(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.keyword === "additionalProperties")).toBe(true);
  });
});

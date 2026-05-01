#!/usr/bin/env node
// Validate a summarize-nextflow JSON document against the embedded schema.
// Exit 0 = valid; 3 = schema-validation failure (matches summarize-nextflow's contract);
// 1 = input error (file missing, malformed JSON).

import { readFileSync } from "node:fs";
import process from "node:process";
import { validateSummary } from "../validate.js";

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] === "--help" || args[0] === "-h") {
  process.stderr.write("usage: validate-summary-nextflow <summary.json>\n");
  process.exit(args.length === 1 ? 0 : 1);
}

const path = args[0]!;
let data: unknown;
try {
  data = JSON.parse(readFileSync(path, "utf8"));
} catch (err) {
  process.stderr.write(
    `error reading ${path}: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
}

const result = validateSummary(data);
if (result.valid) {
  process.stdout.write(`${path}: valid\n`);
  process.exit(0);
}

for (const diag of result.errors) {
  process.stderr.write(`  ${diag.path}: ${diag.message} (${diag.keyword})\n`);
}
process.stderr.write(`${path}: ${result.errors.length} error(s)\n`);
process.exit(3);

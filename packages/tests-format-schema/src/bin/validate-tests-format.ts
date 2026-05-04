#!/usr/bin/env node
// Static validation for Galaxy workflow test YAML files.

import { readFileSync } from "node:fs";
import process from "node:process";
import YAML from "yaml";
import {
  checkTestsAgainstWorkflow,
  extractWorkflowInputs,
  extractWorkflowOutputs,
  validateTestsFile,
  type TestFormatDiagnostic,
} from "@galaxy-tool-util/schema";

interface Options {
  testsPath?: string;
  workflowPath?: string;
  json: boolean;
}

interface ValidationReport {
  valid: boolean;
  schema_valid: boolean;
  workflow_valid: boolean | null;
  schema_errors: TestFormatDiagnostic[];
  workflow_errors: TestFormatDiagnostic[];
}

function usage(exitCode: number): never {
  const out = exitCode === 0 ? process.stdout : process.stderr;
  out.write(
    "usage: validate-tests-format <tests.yml> [--workflow <workflow.ga|workflow.gxwf.yml>] [--json]\n",
  );
  process.exit(exitCode);
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") usage(0);
    if (arg === "--json") {
      opts.json = true;
      continue;
    }
    if (arg === "--workflow") {
      const next = argv[++i];
      if (!next) usage(2);
      opts.workflowPath = next;
      continue;
    }
    if (arg.startsWith("--")) {
      process.stderr.write(`unknown option: ${arg}\n`);
      usage(2);
    }
    if (opts.testsPath) {
      process.stderr.write(`unexpected argument: ${arg}\n`);
      usage(2);
    }
    opts.testsPath = arg;
  }
  if (!opts.testsPath) usage(2);
  return opts;
}

function readYaml(path: string): unknown {
  return YAML.parse(readFileSync(path, "utf8"));
}

function asWorkflowRecord(data: unknown, path: string): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data))
    return data as Record<string, unknown>;
  throw new Error(`${path} must parse to a workflow object`);
}

function printDiagnostics(title: string, diagnostics: TestFormatDiagnostic[]): void {
  if (!diagnostics.length) return;
  process.stderr.write(`${title}:\n`);
  for (const diag of diagnostics) {
    process.stderr.write(`  ${diag.path}: ${diag.message} (${diag.keyword})\n`);
  }
}

const opts = parseArgs(process.argv.slice(2));

try {
  const tests = readYaml(opts.testsPath!);
  const schemaResult = validateTestsFile(tests);
  let workflowErrors: TestFormatDiagnostic[] = [];

  if (opts.workflowPath) {
    const workflow = asWorkflowRecord(readYaml(opts.workflowPath), opts.workflowPath);
    workflowErrors = checkTestsAgainstWorkflow(tests, {
      inputs: extractWorkflowInputs(workflow),
      outputs: extractWorkflowOutputs(workflow),
    });
  }

  const report: ValidationReport = {
    valid: schemaResult.valid && workflowErrors.length === 0,
    schema_valid: schemaResult.valid,
    workflow_valid: opts.workflowPath ? workflowErrors.length === 0 : null,
    schema_errors: schemaResult.errors,
    workflow_errors: workflowErrors,
  };

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.valid) {
    process.stdout.write(`${opts.testsPath}: valid\n`);
  } else {
    printDiagnostics("schema errors", report.schema_errors);
    printDiagnostics("workflow errors", report.workflow_errors);
    process.stderr.write(`${opts.testsPath}: invalid\n`);
  }

  process.exit(report.valid ? 0 : 3);
} catch (err) {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}

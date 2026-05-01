#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "../version.js";

const program = new Command();

program
  .name("summarize-nextflow")
  .description("Statically introspect a Nextflow / nf-core pipeline and emit a JSON summary.")
  .version(VERSION)
  .argument("<path-or-url>", "Path to a local pipeline clone, or a git URL")
  .option("--profile <name>", "Profile to resolve config under", "test")
  .option("--pin <ref>", "Tag, branch, or commit SHA")
  .option("--out <path>", "Write JSON to this path instead of stdout")
  .option("--no-with-nextflow", "Disable Nextflow shell-out; static parse only (default: enabled)")
  .option("--fetch-test-data", "Resolve and hash referenced test data", false)
  .option("--no-validate", "Skip schema validation of the emitted summary (default: enabled)")
  .action((pathOrUrl: string, _options: Record<string, unknown>) => {
    process.stderr.write(`summarize-nextflow ${VERSION}: not yet implemented\n`);
    process.stderr.write(`  target: ${pathOrUrl}\n`);
    process.exit(64);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

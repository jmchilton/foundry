#!/usr/bin/env node

import process from "node:process";
import { runGenerateDashboardCommand } from "../commands/generate-dashboard.js";
import { runGenerateIndexCommand } from "../commands/generate-index.js";
import { runValidateCommand } from "../commands/validate.js";

const COMMANDS = ["validate", "generate-index", "generate-dashboard"] as const;

function main(argv = process.argv.slice(2)): void {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(command ? 0 : 1);
  }

  if (command === "validate") runValidateCommand(rest);
  else if (command === "generate-index") runGenerateIndexCommand(rest);
  else if (command === "generate-dashboard") runGenerateDashboardCommand(rest);
  else {
    process.stderr.write(`unknown command: ${command}\n\n`);
    printHelp();
    process.exit(2);
  }
}

function printHelp(): void {
  process.stdout.write(`foundry-build <command> [options]\n\nCommands:\n`);
  for (const command of COMMANDS) process.stdout.write(`  ${command}\n`);
}

main();

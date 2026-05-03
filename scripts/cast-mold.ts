#!/usr/bin/env tsx

import { runCastMoldCommand } from "../packages/build-cli/src/commands/cast-mold.js";

runCastMoldCommand().catch((e) => {
  console.error(e);
  process.exit(1);
});

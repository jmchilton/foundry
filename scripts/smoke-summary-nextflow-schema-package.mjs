import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(tmpdir(), "foundry-schema-smoke-"));
const consumerDir = join(tempRoot, "consumer");
mkdirSync(consumerDir);

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

run("pnpm", [
  "--filter",
  "@galaxy-foundry/summary-nextflow-schema",
  "pack",
  "--pack-destination",
  tempRoot,
], { cwd: repoRoot });

const tarball = readdirSync(tempRoot).find((name) => name.endsWith(".tgz"));
if (!tarball) {
  throw new Error(`no package tarball found in ${tempRoot}`);
}

run("npm", ["init", "-y"], { cwd: consumerDir });
run("npm", ["install", join(tempRoot, tarball)], { cwd: consumerDir });

const summaryPath = join(
  repoRoot,
  "casts/claude/skills/summarize-nextflow/runs/nf-core__demo/summary.json",
);
const smokeScript = join(consumerDir, "smoke.mjs");
writeFileSync(
  smokeScript,
  `import { readFileSync } from "node:fs";\n` +
    `import { summaryNextflowSchema, validateSummary } from "@galaxy-foundry/summary-nextflow-schema";\n` +
    `const data = JSON.parse(readFileSync(${JSON.stringify(summaryPath)}, "utf8"));\n` +
    `if (!summaryNextflowSchema.$schema) throw new Error("schema missing $schema");\n` +
    `const result = validateSummary(data);\n` +
    `if (!result.valid) throw new Error(JSON.stringify(result.errors));\n`,
);

run("node", [smokeScript], { cwd: consumerDir });
run("npx", ["validate-summary-nextflow", summaryPath], { cwd: consumerDir });

console.log(`smoke install ok: ${join(tempRoot, tarball)}`);

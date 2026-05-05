#!/usr/bin/env node
// tsc emits only .js/.d.ts/.map; the .json schema needs a separate copy step
// to reach dist/ so the published package can resolve "./schema.json".

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(PKG_ROOT, "..", "..");

const ASSETS = [
  [resolve(PKG_ROOT, "src/summary-nextflow.schema.json"), "dist/summary-nextflow.schema.json"],
  [
    resolve(REPO_ROOT, "content/schemas/nextflow-parameters-meta.schema.json"),
    "dist/nextflow-parameters-meta.schema.json",
  ],
  [
    resolve(REPO_ROOT, "content/schemas/nf-core-module-meta.schema.json"),
    "dist/nf-core-module-meta.schema.json",
  ],
  [
    resolve(REPO_ROOT, "content/schemas/nf-core-subworkflow-meta.schema.json"),
    "dist/nf-core-subworkflow-meta.schema.json",
  ],
];

for (const [src, dst] of ASSETS) {
  const srcPath = src;
  const dstPath = resolve(PKG_ROOT, dst);
  mkdirSync(dirname(dstPath), { recursive: true });
  copyFileSync(srcPath, dstPath);
  console.log(`copied ${srcPath} → ${dst}`);
}

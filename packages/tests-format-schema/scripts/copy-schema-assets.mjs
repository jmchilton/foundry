#!/usr/bin/env node
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");
const src = resolve(PKG_ROOT, "src/tests.schema.json");
const dst = resolve(PKG_ROOT, "dist/tests.schema.json");

mkdirSync(dirname(dst), { recursive: true });
copyFileSync(src, dst);

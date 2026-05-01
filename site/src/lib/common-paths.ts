// Loads `common_paths.yml` from the repo root and exposes citation helpers.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { builtinPaths, type CommonPathEntry, type CommonPaths } from "../../../scripts/lib/common-paths-core";

export { CITATION_RE, citationGithubUrl, parseCitation, type Citation, type CommonPaths } from "../../../scripts/lib/common-paths-core";

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  if (p === "~") return os.homedir();
  return p;
}

function normalizeKeys(raw: Record<string, CommonPathEntry>): CommonPaths {
  const out: CommonPaths = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k.toLowerCase()] = { ...v, path: expandHome(v.path) };
  }
  return out;
}

export function loadCommonPaths(repoRoot: string): CommonPaths {
  const builtins = builtinPaths(repoRoot);
  const local = path.join(repoRoot, "common_paths.yml");
  const sample = path.join(repoRoot, "common_paths.yml.sample");
  const file = fs.existsSync(local) ? local : fs.existsSync(sample) ? sample : null;
  if (!file) return builtins;
  try {
    const raw = yaml.load(fs.readFileSync(file, "utf-8")) as Record<string, CommonPathEntry> | null;
    return raw ? { ...builtins, ...normalizeKeys(raw) } : builtins;
  } catch {
    return builtins;
  }
}

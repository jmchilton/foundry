// Loads `common_paths.yml` (or falls back to `common_paths.yml.sample`),
// expands ~ in paths, and exposes citation-resolving helpers.
//
// Citation form (inside inline code in note bodies):
//   $NAME/relative/path:LINE
//   $NAME/relative/path:LINE-LINE
//   $NAME/relative/path

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";

export interface CommonPathEntry {
  path: string;
  repo?: string;
  ref?: string;
  path_prefix?: string;
}

export type CommonPaths = Record<string, CommonPathEntry>;

export interface Citation {
  name: string;
  entry: CommonPathEntry;
  relPath: string;
  lineStart?: number;
  lineEnd?: number;
}

// $NAME — uppercase letters/digits/underscore, must start with a letter.
// Captures the path up to optional `:LINE` or `:LINE-LINE` suffix.
export const CITATION_RE = /^\$([A-Z][A-Z0-9_]*)\/([^\s:]+)(?::(\d+)(?:-(\d+))?)?$/;

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
  const local = path.join(repoRoot, "common_paths.yml");
  const sample = path.join(repoRoot, "common_paths.yml.sample");
  const file = fs.existsSync(local) ? local : fs.existsSync(sample) ? sample : null;
  if (!file) return {};
  try {
    const raw = yaml.load(fs.readFileSync(file, "utf-8")) as Record<string, CommonPathEntry> | null;
    return raw ? normalizeKeys(raw) : {};
  } catch {
    return {};
  }
}

export function parseCitation(text: string, paths: CommonPaths): Citation | null {
  const m = CITATION_RE.exec(text.trim());
  if (!m) return null;
  const [, name, relPath, lineStart, lineEnd] = m;
  const entry = paths[name.toLowerCase()];
  if (!entry) return null;
  return {
    name,
    entry,
    relPath,
    lineStart: lineStart ? Number(lineStart) : undefined,
    lineEnd: lineEnd ? Number(lineEnd) : undefined,
  };
}

export function citationGithubUrl(c: Citation): string | null {
  const { entry, relPath, lineStart, lineEnd } = c;
  if (!entry.repo) return null;
  const ref = entry.ref ?? "main";
  const fullPath = entry.path_prefix ? `${entry.path_prefix.replace(/\/$/, "")}/${relPath}` : relPath;
  let url = `https://github.com/${entry.repo}/blob/${ref}/${fullPath}`;
  if (lineStart) url += `#L${lineStart}${lineEnd ? `-L${lineEnd}` : ""}`;
  return url;
}

export function citationLocalPath(c: Citation): string {
  return path.join(c.entry.path, c.relPath);
}

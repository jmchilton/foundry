// Frontmatter loading + date-string normalization.
// js-yaml parses bare YAML dates (2026-04-30) as JS Date objects; the schema expects ISO strings.

import matter from "gray-matter";
import { readFileSync } from "node:fs";
import type { Frontmatter } from "./types.js";

export interface ParsedFile {
  meta: Frontmatter;
  body: string;
  hasFrontmatter: boolean;
}

export function readMarkdown(filePath: string): ParsedFile {
  const text = readFileSync(filePath, "utf8");
  const hasFrontmatter = text.startsWith("---");
  if (!hasFrontmatter) {
    return { meta: {}, body: text, hasFrontmatter: false };
  }
  const parsed = matter(text);
  return {
    meta: normalizeDates(parsed.data),
    body: parsed.content,
    hasFrontmatter: true,
  };
}

/** Convert Date values to ISO date strings (YYYY-MM-DD). Recursive on plain objects/arrays. */
export function normalizeDates(data: unknown): Frontmatter {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return data as Frontmatter;
  }
  const out: Frontmatter = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    out[k] = normalizeValue(v);
  }
  return out;
}

function normalizeValue(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, vv] of Object.entries(v as Record<string, unknown>)) {
      out[k] = normalizeValue(vv);
    }
    return out;
  }
  return v;
}

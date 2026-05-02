#!/usr/bin/env tsx

import { loadContentNotes, sortByTitle, wikiLink, writeOrCheck, type ContentNote } from "./lib/content-notes.js";

const OUTPUT = "content/Index.md";

const TYPE_LABELS: Record<string, string> = {
  pipeline: "Pipelines",
  mold: "Molds",
  pattern: "Patterns",
  "cli-command": "CLI Commands",
  schema: "Schemas",
  "research/component": "Component Research",
  "research/design-problem": "Design Problems",
  "research/design-spec": "Design Specs",
};

function main(): void {
  const check = process.argv.includes("--check");
  const notes = loadContentNotes().filter((note) => note.status !== "archived");
  const grouped = groupByType(notes);
  const orderedKeys = Object.keys(TYPE_LABELS).filter((key) => grouped.has(key));
  const remainingKeys = [...grouped.keys()].filter((key) => !TYPE_LABELS[key]).sort();

  const parts: string[] = [
    "# Index",
    "",
    "Generated from content frontmatter. Do not edit by hand.",
    "",
  ];

  for (const key of [...orderedKeys, ...remainingKeys]) {
    const sectionNotes = sortByTitle(grouped.get(key) ?? []);
    parts.push(`## ${TYPE_LABELS[key] ?? titleFromKey(key)}`, "");
    for (const note of sectionNotes) {
      const status = note.status === "draft" ? "" : ` *(${note.status})*`;
      parts.push(`- ${wikiLink(note)} — ${note.summary}${status}`);
    }
    parts.push("");
  }

  writeOrCheck(OUTPUT, parts.join("\n"), check);
}

function groupByType(notes: ContentNote[]): Map<string, ContentNote[]> {
  const grouped = new Map<string, ContentNote[]>();
  for (const note of notes) {
    const key = note.type === "research" && note.subtype ? `${note.type}/${note.subtype}` : note.type;
    const bucket = grouped.get(key) ?? [];
    bucket.push(note);
    grouped.set(key, bucket);
  }
  return grouped;
}

function titleFromKey(key: string): string {
  return key.replace(/[/-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

main();

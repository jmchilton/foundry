#!/usr/bin/env tsx

import { loadContentNotes, loadDashboardSections, markdownTable, sortByRevisedDesc, wikiLink, writeOrCheck } from "./lib/content-notes.js";

const OUTPUT = "content/Dashboard.md";

function main(): void {
  const check = process.argv.includes("--check");
  const notes = loadContentNotes().filter((note) => note.status !== "archived");
  const sections = loadDashboardSections();

  const parts: string[] = [
    "# Dashboard",
    "",
    "Generated from `dashboard_sections.json` and content frontmatter. Do not edit by hand.",
    "",
  ];

  for (const section of sections) {
    const sectionNotes = sortByRevisedDesc(notes.filter((note) => note.tags.includes(section.tag)));
    if (sectionNotes.length === 0) continue;
    parts.push(`## ${section.label}`, "");
    parts.push(
      markdownTable([
        ["Name", "Summary", "Status", "Revised", "Rev"],
        ...sectionNotes.map((note) => [wikiLink(note), note.summary, note.status, note.revised, String(note.revision)]),
      ]),
      "",
    );
  }

  writeOrCheck(OUTPUT, parts.join("\n"), check);
}

main();

// Shared wiki-link slug + resolver. Imported by validator AND Astro site
// (via path alias `@foundry/lib/wiki-links` or relative import).
//
// Slug algorithm (galaxy-brain compatible):
//   lower → "  -  " → "-" → spaces → "-" → strip [^a-z0-9-] → collapse dashes
//
// Resolution: exact basename-slug match first, then prefix-match fallback.
// Prefix candidates are sorted shortest-first then alphabetically — closest
// completion of the typed stub wins, deterministically. Eliminates
// galaxy-brain's dict-iteration-order non-determinism.

export const WIKI_LINK_RE = /^\[\[(.+)\]\]$/;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+-\s+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function stripBrackets(wikiLink: unknown): string | null {
  if (typeof wikiLink !== "string") return null;
  const m = WIKI_LINK_RE.exec(wikiLink);
  return m && m[1] ? m[1].trim() : null;
}

export function resolveWikiLink(wikiLink: unknown, slugToPath: Map<string, string>): string | null {
  const label = stripBrackets(wikiLink);
  if (!label) return null;
  const hashIdx = label.indexOf("#");
  const pageLabel = hashIdx >= 0 ? label.slice(0, hashIdx) : label;
  const slug = slugify(pageLabel);
  if (!slug) return null;
  const exact = slugToPath.get(slug);
  if (exact) return exact;

  const candidates: Array<[string, string]> = [];
  for (const [key, path] of slugToPath) {
    if (key.startsWith(slug)) candidates.push([key, path]);
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const lenDiff = a[0].length - b[0].length;
    return lenDiff !== 0 ? lenDiff : a[0].localeCompare(b[0]);
  });
  const first = candidates[0];
  return first ? first[1] : null;
}

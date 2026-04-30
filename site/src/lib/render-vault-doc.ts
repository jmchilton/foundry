import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { resolveWikiLink, type WikiLinkTarget } from './wiki-links';

const CONTENT_DIR = path.resolve('../content');

/**
 * Load a content-root markdown file (log.md, glossary.md), resolve [[wiki links]],
 * and render to HTML.
 */
export function renderContentDoc(
  filename: string,
  linkMap: Map<string, WikiLinkTarget>,
  base: string
): string {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8');
  const withLinks = raw.replace(/\[\[([^\[\]]+)\]\]/g, (_, inner) => {
    const { href, label } = resolveWikiLink(`[[${inner}]]`, linkMap, base);
    return href ? `[${label}](${href})` : `**${label}**`;
  });
  const html = marked.parse(withLinks, { async: false }) as string;
  return addBoldTermAnchors(html);
}

function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Glossary entries are paragraphs starting with **Term**. Inject an id on the
// containing <p> so that #term anchor links from the landing page resolve.
function addBoldTermAnchors(html: string): string {
  return html.replace(
    /<p>(\s*)<strong>([^<]+)<\/strong>/g,
    (match, ws, term) => {
      const id = slugifyTerm(term);
      if (!id) return match;
      return `<p id="${id}">${ws}<strong>${term}</strong>`;
    }
  );
}

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
  return marked.parse(withLinks, { async: false }) as string;
}

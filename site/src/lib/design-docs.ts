import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const DOCS_DIR = path.resolve('../docs');

export type DesignDoc = {
  slug: string;
  title: string;
  source: string;
  summary: string;
};

export const DESIGN_DOCS: DesignDoc[] = [
  {
    slug: 'guiding-principles',
    title: 'Guiding Principles',
    source: 'GUIDING_PRINCIPLES.md',
    summary: 'The design pressure behind source authority, progressive disclosure, validation, portability, and corpus grounding.',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    source: 'ARCHITECTURE.md',
    summary: 'Physical layout, content types, validation pipeline, generated artifacts, and site rendering.',
  },
  {
    slug: 'molds',
    title: 'Molds',
    source: 'MOLDS.md',
    summary: 'The Mold inventory, bucketing axes, and boundaries between Molds and reference content.',
  },
  {
    slug: 'casting',
    title: 'Compilation Pipeline',
    source: 'COMPILATION_PIPELINE.md',
    summary: 'How typed Mold references become target-specific cast skills with provenance.',
  },
  {
    slug: 'corpus',
    title: 'Corpus Integration',
    source: 'CORPUS_INGESTION.md',
    summary: 'How IWC grounding works without turning the Foundry into an upstream workflow mirror.',
  },
  {
    slug: 'harness-pipelines',
    title: 'Harness Pipelines',
    source: 'HARNESS_PIPELINES.md',
    summary: 'The source-to-target journeys that compose Molds, loops, and branch phases.',
  },
];

export function getDesignDoc(slug: string): DesignDoc | undefined {
  return DESIGN_DOCS.find(doc => doc.slug === slug);
}

export function renderDesignDoc(doc: DesignDoc, base: string): string {
  const raw = fs.readFileSync(path.join(DOCS_DIR, doc.source), 'utf-8');
  const withoutTitle = raw.replace(/^# .+\n+/, '');
  const rewritten = rewriteDocLinks(withoutTitle, base);
  return marked.parse(rewritten, { async: false }) as string;
}

function rewriteDocLinks(markdown: string, base: string): string {
  const bySource = new Map(DESIGN_DOCS.map(doc => [doc.source, doc.slug]));
  return markdown.replace(/\]\(([^)]+\.md)(#[^)]+)?\)/g, (match, target, hash = '') => {
    const filename = target.split('/').pop();
    const slug = filename ? bySource.get(filename) : undefined;
    if (!slug) return match;
    return `](${base}/design/${slug}/${hash})`;
  });
}

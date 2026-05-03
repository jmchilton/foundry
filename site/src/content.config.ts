import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { contractKeys, loadReferenceContract } from './lib/reference-contract';

const referenceContract = loadReferenceContract();

function registryEnum(group: keyof typeof referenceContract) {
  const values = contractKeys(referenceContract, group);
  return z.string().refine((v: string) => values.includes(v), { message: `must be one of: ${values.join(', ')}` });
}

function slugifyPath(entry: string): string {
  return entry.replace(/\.md$/, '').split('/')
    .map(s => s.toLowerCase().replace(/\s+-\s+/g, '-').replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-'))
    .join('/');
}

const wikiLink = z.string().regex(/^\[\[.+\]\]$/, { message: 'must be a [[wiki-link]]' });

const typedReference = z.object({
  kind: registryEnum('kinds'),
  ref: z.string().min(1),
  used_at: registryEnum('used_at'),
  load: registryEnum('load'),
  mode: registryEnum('modes'),
  evidence: registryEnum('evidence'),
  purpose: z.string().min(1).optional(),
  trigger: z.string().min(1).optional(),
  verification: z.string().min(1).optional(),
}).strict().superRefine((ref: any, ctx: any) => {
  if (ref.evidence === 'hypothesis' && !ref.verification) {
    ctx.addIssue({ code: 'custom', message: 'hypothesis references require `verification`' });
  }
});

const baseFields = {
  tags: z.array(z.string()).min(1),
  status: z.enum(['draft', 'reviewed', 'revised', 'stale', 'archived']),
  created: z.coerce.date(),
  revised: z.coerce.date(),
  revision: z.number().int().min(1),
  ai_generated: z.boolean(),
  summary: z.string().min(20).max(160),
  title: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  sources: z.array(z.string().min(1)).min(1).optional(),
  related_notes: z.array(wikiLink).optional(),
  related_patterns: z.array(wikiLink).optional(),
  related_molds: z.array(wikiLink).optional(),
};

// Pipeline phase: Mold-shape or branch-shape. Branch can have branches[] or chain[].
const branchItem: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    wikiLink,
    z.string(), // free-text terminal like "user-supplied"
    z.object({ fallthrough: wikiLink }).strict(),
  ])
);

const moldPhase = z.object({
  mold: wikiLink,
  loop: z.boolean().optional(),
}).strict();

const branchPhase = z.object({
  branch: z.string(),
  loop: z.boolean().optional(),
  branches: z.array(branchItem).optional(),
  chain: z.array(branchItem).optional(),
}).strict().refine(p => p.branches || p.chain, {
  message: 'branch phase needs `branches` or `chain`',
});

const phase = z.union([moldPhase, branchPhase]);

const moldSchema = z.object({
  type: z.literal('mold'),
  name: z.string(),
  axis: z.enum(['source-specific', 'target-specific', 'tool-specific', 'generic']),
  source: z.enum(['paper', 'nextflow', 'cwl']).optional(),
  target: z.enum(['galaxy', 'cwl', 'web', 'generic']).optional(),
  tool: z.enum(['gxwf', 'planemo']).optional(),
  patterns: z.array(wikiLink).optional(),
  cli_commands: z.array(wikiLink).optional(),
  prompts: z.array(wikiLink).optional(),
  input_schemas: z.array(z.string()).optional(),
  output_schemas: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  references: z.array(typedReference).optional(),
  ...baseFields,
}).strict();

const patternSchema = z.object({
  type: z.literal('pattern'),
  pattern_kind: z.enum(['leaf', 'moc']),
  evidence: z.enum(['corpus-observed', 'structurally-verified', 'corpus-and-verified', 'hypothesis']),
  title: z.string(),
  parent_pattern: wikiLink.optional(),
  verification_paths: z.array(z.string()).optional(),
  ...baseFields,
}).strict();

const cliCommandSchema = z.object({
  type: z.literal('cli-command'),
  tool: z.enum(['gxwf', 'planemo']),
  command: z.string(),
  ...baseFields,
}).strict();

const pipelineSchema = z.object({
  type: z.literal('pipeline'),
  title: z.string(),
  phases: z.array(phase).min(1),
  ...baseFields,
}).strict();

const researchSchema = z.object({
  type: z.literal('research'),
  subtype: z.enum(['component', 'design-problem', 'design-spec']),
  component: z.string().optional(),
  ...baseFields,
}).strict();

const schemaNoteSchema = z.object({
  type: z.literal('schema'),
  name: z.string(),
  title: z.string(),
  package: z.string().optional(),
  upstream: z.string().optional(),
  package_export: z.string().optional(),
  ...baseFields,
}).strict();

const noteSchema = z.discriminatedUnion('type', [
  moldSchema,
  patternSchema,
  cliCommandSchema,
  pipelineSchema,
  researchSchema,
  schemaNoteSchema,
]).superRefine((d, ctx) => {
  if (d.type !== 'mold') return;
  if (d.axis === 'source-specific' && !d.source) ctx.addIssue({ code: 'custom', message: 'source-specific mold requires `source`' });
  if (d.axis === 'target-specific' && !d.target) ctx.addIssue({ code: 'custom', message: 'target-specific mold requires `target`' });
  if (d.axis === 'tool-specific' && !d.tool) ctx.addIssue({ code: 'custom', message: 'tool-specific mold requires `tool`' });
});

const content = defineCollection({
  loader: glob({
    pattern: [
      'cli/**/*.md',
      'molds/**/index.md',
      'patterns/**/*.md',
      'pipelines/**/*.md',
      'research/**/*.md',
      'schemas/**/*.md',
      '!Dashboard.md',
      '!Index.md',
      '!log.md',
      '!glossary.md',
    ],
    base: '../content',
    generateId({ entry }) {
      let id = slugifyPath(entry);
      if (id.endsWith('/index')) id = id.slice(0, -'/index'.length);
      return id;
    },
  }),
  schema: noteSchema,
});

export const collections = { content };

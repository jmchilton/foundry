// Discover cast artifacts on disk for a given Mold slug.
//
// Layout:
//   casts/claude/skills/<mold>/SKILL.md   (Claude target — under skills/ for plugin layout)
//   casts/web/<mold>/...                   (web target — placeholder)
//   casts/generic/<mold>/...               (generic target — placeholder)
//
// Used by the Astro Mold page (Cast Artifacts panel) and the /usage/ index.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type CastTarget = 'claude' | 'web' | 'generic';

export interface CastArtifact {
  target: CastTarget;
  moldSlug: string;
  /** Repo-absolute directory of the cast. */
  dir: string;
  /** True if the cast has a SKILL.md (Claude convention). */
  hasSkill: boolean;
  /** Parsed name from SKILL.md frontmatter. */
  name?: string;
  /** Parsed description from SKILL.md frontmatter. */
  description?: string;
}

const TARGETS: CastTarget[] = ['claude', 'web', 'generic'];

/** Repo root inferred relative to this file: site/src/lib → ../../.. */
function defaultRepoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..');
}

function castDirFor(target: CastTarget, moldSlug: string, repoRoot: string): string {
  if (target === 'claude') return path.join(repoRoot, 'casts', target, 'skills', moldSlug);
  return path.join(repoRoot, 'casts', target, moldSlug);
}

function readSkillFrontmatter(skillPath: string): { name?: string; description?: string } {
  if (!existsSync(skillPath)) return {};
  const text = readFileSync(skillPath, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: { name?: string; description?: string } = {};
  for (const line of m[1]!.split('\n')) {
    const k = line.match(/^(name|description):\s*(.*?)\s*$/);
    if (!k) continue;
    let v = k[2]!;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k[1] as 'name' | 'description'] = v;
  }
  return out;
}

/** All cast artifacts for one mold, across targets. */
export function listCastsForMold(moldSlug: string, repoRoot: string = defaultRepoRoot()): CastArtifact[] {
  const out: CastArtifact[] = [];
  for (const target of TARGETS) {
    const dir = castDirFor(target, moldSlug, repoRoot);
    if (!existsSync(dir)) continue;
    const skillPath = path.join(dir, 'SKILL.md');
    const hasSkill = existsSync(skillPath);
    const fm = hasSkill ? readSkillFrontmatter(skillPath) : {};
    out.push({ target, moldSlug, dir, hasSkill, ...fm });
  }
  return out;
}

/** All cast artifacts across all molds, by walking the casts tree. */
export function listAllCasts(repoRoot: string = defaultRepoRoot()): CastArtifact[] {
  const out: CastArtifact[] = [];
  for (const target of TARGETS) {
    const root = target === 'claude'
      ? path.join(repoRoot, 'casts', 'claude', 'skills')
      : path.join(repoRoot, 'casts', target);
    if (!existsSync(root)) continue;
    let entries: string[];
    try { entries = readdirSync(root); } catch { continue; }
    for (const name of entries) {
      if (name.startsWith('.') || name.startsWith('_')) continue;
      const dir = path.join(root, name);
      if (!statSync(dir).isDirectory()) continue;
      const skillPath = path.join(dir, 'SKILL.md');
      const hasSkill = existsSync(skillPath);
      const fm = hasSkill ? readSkillFrontmatter(skillPath) : {};
      out.push({ target, moldSlug: name, dir, hasSkill, ...fm });
    }
  }
  return out.sort((a, b) =>
    a.target.localeCompare(b.target) || a.moldSlug.localeCompare(b.moldSlug),
  );
}

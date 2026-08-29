import { realpathSync } from "node:fs";
import path from "node:path";

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function resolveInstalledSkill(skillsRoot: string, skill: string): string {
  if (!SKILL_NAME.test(skill)) throw new Error(`invalid Foundry skill name: ${skill}`);
  const root = realpathSync(skillsRoot);
  const resolved = realpathSync(path.join(root, skill));
  if (path.dirname(resolved) !== root) {
    throw new Error(`Foundry skill resolves outside installed skill root: ${skill}`);
  }
  return resolved;
}

export function resolveDeclaredInput(cwd: string, input: string): string {
  if (path.isAbsolute(input))
    throw new Error(`declared input must be relative to the run: ${input}`);
  const root = realpathSync(cwd);
  const resolved = realpathSync(path.resolve(root, input));
  const relation = path.relative(root, resolved);
  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new Error(`declared input escapes the Pipeline run directory: ${input}`);
  }
  return resolved;
}

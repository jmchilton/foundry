import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { citationLocalPath, loadCommonPaths, parseCitation } from "./common-paths";

export interface VendoredUpstreamEntry {
  local: string;
  source: string;
  pinned_ref: string;
  framing?: string;
}

export interface VendoredDrift {
  entry: VendoredUpstreamEntry;
  sourcePath: string;
  currentRef: string;
}

export function loadVendoredUpstreams(
  repoRoot: string,
  manifestPath = path.join(repoRoot, "vendored_upstreams.yml"),
): VendoredUpstreamEntry[] {
  if (!fs.existsSync(manifestPath)) return [];
  const raw = yaml.load(fs.readFileSync(manifestPath, "utf-8"));
  if (!Array.isArray(raw)) throw new Error(`${manifestPath} must contain an array`);
  return raw.map((entry, i) => {
    if (!entry || typeof entry !== "object")
      throw new Error(`vendored entry ${i + 1} must be an object`);
    const value = entry as Partial<VendoredUpstreamEntry>;
    if (!value.local || !value.source || !value.pinned_ref) {
      throw new Error(`vendored entry ${i + 1} requires local, source, and pinned_ref`);
    }
    return {
      local: value.local,
      source: value.source,
      pinned_ref: value.pinned_ref,
      framing: value.framing,
    };
  });
}

export function currentRepoRef(repoPath: string): string {
  return execFileSync("git", ["-C", repoPath, "rev-parse", "HEAD"], { encoding: "utf-8" }).trim();
}

export function resolveSource(
  repoRoot: string,
  source: string,
): { sourcePath: string; repoPath: string; currentRef: string } {
  const paths = loadCommonPaths(repoRoot);
  const citation = parseCitation(source, paths);
  if (!citation) throw new Error(`Cannot resolve source citation ${source}`);
  return {
    sourcePath: citationLocalPath(citation),
    repoPath: citation.entry.path,
    currentRef: currentRepoRef(citation.entry.path),
  };
}

export function findVendoredDrift(
  repoRoot: string,
  entries = loadVendoredUpstreams(repoRoot),
): VendoredDrift[] {
  const drift: VendoredDrift[] = [];
  for (const entry of entries) {
    const localPath = path.join(repoRoot, entry.local);
    const source = resolveSource(repoRoot, entry.source);
    if (!fs.existsSync(localPath)) throw new Error(`Missing vendored file ${entry.local}`);
    if (!fs.existsSync(source.sourcePath)) throw new Error(`Missing source file ${entry.source}`);
    if (fs.readFileSync(localPath, "utf-8") !== fs.readFileSync(source.sourcePath, "utf-8")) {
      drift.push({ entry, sourcePath: source.sourcePath, currentRef: source.currentRef });
    }
  }
  return drift;
}

export function syncVendoredUpstreams(
  repoRoot: string,
  entries = loadVendoredUpstreams(repoRoot),
): VendoredDrift[] {
  const updated: VendoredDrift[] = [];
  const framingRefs = new Map<string, string>();
  for (const entry of entries) {
    const localPath = path.join(repoRoot, entry.local);
    const source = resolveSource(repoRoot, entry.source);
    if (!fs.existsSync(source.sourcePath)) throw new Error(`Missing source file ${entry.source}`);
    fs.copyFileSync(source.sourcePath, localPath);
    updated.push({ entry, sourcePath: source.sourcePath, currentRef: source.currentRef });
    if (entry.framing) framingRefs.set(entry.framing, source.currentRef);
  }
  for (const [framing, ref] of framingRefs) updateFramingRef(path.join(repoRoot, framing), ref);
  return updated;
}

export function updateVendoredManifestRefs(
  manifestPath: string,
  updates: Map<string, string>,
): void {
  let currentLocal: string | null = null;
  const lines = fs.readFileSync(manifestPath, "utf-8").split("\n");
  const next = lines.map((line) => {
    const localMatch = /^-\s+local:\s*(\S+)\s*$/.exec(line);
    if (localMatch) currentLocal = localMatch[1] ?? null;
    if (currentLocal && updates.has(currentLocal)) {
      const pinMatch = /^(\s*pinned_ref:\s*).+$/.exec(line);
      if (pinMatch) return `${pinMatch[1]}${updates.get(currentLocal)}`;
    }
    return line;
  });
  fs.writeFileSync(manifestPath, next.join("\n"));
}

export function updateFramingRef(filePath: string, ref: string): void {
  const shortRef = ref.slice(0, 7);
  const text = fs.readFileSync(filePath, "utf-8");
  const next = text
    .replace(/pinned at SHA `[^`]+`/g, `pinned at SHA \`${shortRef}\``)
    .replace(/blob\/[0-9a-f]{7,40}\//g, `blob/${ref}/`)
    .replace(/^sha: [0-9a-f]{7,40}$/gm, `sha: ${shortRef}`)
    .replace(/revised: \d{4}-\d{2}-\d{2}/, `revised: ${new Date().toISOString().slice(0, 10)}`);
  fs.writeFileSync(filePath, next);
}

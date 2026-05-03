import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import YAML from "yaml";

interface Summary {
  source: Record<string, unknown>;
  params: Param[];
  profiles: string[];
  tools: Tool[];
  processes: Process[];
  subworkflows: Subworkflow[];
  workflow: { name: string; channels: Channel[]; edges: Edge[]; conditionals: Conditional[] };
  test_fixtures: { profile: string; inputs: TestDataRef[]; outputs: unknown[] };
  nf_tests: NfTest[];
  warnings: string[];
}

interface Subworkflow {
  name: string;
  path: string;
  kind: "pipeline" | "utility";
  calls: string[];
  inputs?: ChannelIO[];
  outputs?: ChannelIO[];
  tests: NfTest[];
}

interface ParsedWorkflow extends Subworkflow {
  body: string;
}

interface Channel {
  name: string;
  source: string;
  shape: string;
}

interface Edge {
  from: string;
  to: string;
  via?: string[];
}

interface Conditional {
  guard: string;
  branch: "default" | "alternate";
  affects: string[];
}

interface Param {
  name: string;
  type: string;
  default?: unknown;
  description?: string;
  required: boolean;
  enum?: unknown[];
}

interface Tool {
  name: string;
  version: string;
  biocontainer: string | null;
  bioconda: string | null;
  docker: string | null;
  singularity: string | null;
  wave: string | null;
}

interface ChannelIO {
  name: string;
  shape: string;
  description?: string;
  topic: string | null;
}

interface Process {
  name: string;
  aliases: string[];
  module_path: string;
  meta: ModuleMeta | null;
  module_tests: NfTest[];
  tool: string | null;
  container: string | null;
  conda: string | null;
  inputs: ChannelIO[];
  outputs: ChannelIO[];
  when: string | null;
  script_summary: string;
  publish_dir: string | null;
}

interface ModuleMeta {
  description?: string;
  keywords: string[];
  authors: string[];
  maintainers: string[];
  tools: ModuleMetaEntry[];
  input: ModuleMetaEntry[];
  output: ModuleMetaEntry[];
}

interface ModuleMetaEntry {
  name: string;
  description?: string;
  homepage?: string;
  documentation?: string;
  tool_dev_url?: string;
  doi?: string;
  licence?: string[];
  identifier?: string;
  type?: string;
  pattern?: string;
}

interface TestDataRef {
  role: string;
  path: string | null;
  url: string | null;
  sha1: string | null;
  filetype: string | null;
  description: string | null;
}

interface NfTest {
  name: string;
  path: string;
  profiles: string[];
  params_overrides: Record<string, unknown>;
  assert_workflow_success: boolean;
  snapshot: {
    captures: string[];
    helpers: string[];
    ignore_files: string[];
    ignore_globs: string[];
    snap_path: string | null;
  } | null;
  prose_assertions: string[];
}

export interface ResolveOptions {
  profile: string;
  withNextflow: boolean;
  fetchTestData: boolean;
  testDataDir?: string;
}

export async function resolveNextflowSummary(
  pipelineRoot: string,
  options: ResolveOptions,
): Promise<Summary> {
  const root = detectPipelineRoot(pipelineRoot);
  pipelineRoot = root.path;

  const configPath = join(pipelineRoot, "nextflow.config");
  const config = existsSync(configPath) ? readText(configPath) : "";
  const workflowName = parseWorkflowName(config);
  const processFiles = discoverProcessFiles(pipelineRoot);
  const processes = processFiles.flatMap((path) => parseProcessFile(pipelineRoot, path));
  const aliases = discoverProcessAliases(pipelineRoot);
  const tools = buildTools(pipelineRoot, processes);
  const workflows = parseWorkflows(
    pipelineRoot,
    processes.map((process) => process.name),
  );
  const primaryWorkflow = selectPrimaryWorkflow(workflows);
  const warnings = buildWarnings(processes, workflows);

  const summary: Summary = {
    source: {
      ecosystem: workflowName.startsWith("nf-core/") ? "nf-core" : "nextflow",
      workflow: workflowName.split("/").at(-1) ?? basename(pipelineRoot),
      url: normalizeGitUrl(
        gitOutput(pipelineRoot, ["remote", "get-url", "origin"]) ??
          "https://example.invalid/unknown.git",
      ),
      version: gitOutput(pipelineRoot, ["rev-parse", "HEAD"]) ?? "unknown",
      license: existsSync(join(pipelineRoot, "LICENSE")) ? "MIT" : null,
      slug: workflowName.replace("/", "-"),
    },
    params: parseParams(pipelineRoot),
    profiles: parseProfiles(config),
    tools,
    processes: processes.map((process) => ({
      ...process,
      aliases: aliases.get(process.name) ?? [],
      tool:
        tools.find((tool) => process.name.toLowerCase().includes(tool.name))?.name ?? process.tool,
    })),
    subworkflows: workflows
      .filter((workflow) => workflow.name !== primaryWorkflow?.name)
      .map(stripWorkflowBody),
    workflow: {
      name: primaryWorkflow?.name ?? workflowName.split("/").at(-1)?.toUpperCase() ?? "WORKFLOW",
      channels: primaryWorkflow ? parseWorkflowChannels(primaryWorkflow.body) : [],
      edges: primaryWorkflow ? parseWorkflowEdges(primaryWorkflow.body, primaryWorkflow.calls) : [],
      conditionals: primaryWorkflow
        ? parseWorkflowConditionals(primaryWorkflow.body, primaryWorkflow.calls)
        : [],
    },
    test_fixtures: parseTestFixtures(pipelineRoot, options.profile),
    nf_tests: parseNfTests(pipelineRoot),
    warnings: [...root.warnings, ...warnings],
  };

  const entrypoint = selectEntrypoint(pipelineRoot);
  if (entrypoint) summary.warnings.push(`selected Nextflow entrypoint: ${entrypoint}`);

  if (options.withNextflow) mergeNextflowInspect(summary, pipelineRoot, options.profile);
  if (options.fetchTestData) await fetchTestData(summary, options.testDataDir);
  return summary;
}

function buildWarnings(processes: Process[], workflows: ParsedWorkflow[]): string[] {
  const warnings = ["workflow graph extraction is intentionally partial in resolver v1"];
  if (!processes.some((process) => process.module_path.startsWith(`modules${sep}`))) {
    warnings.push(
      "no module process files found under modules/; process extraction may be incomplete",
    );
  }
  if (workflows.length === 0) {
    warnings.push("no named workflow blocks found; summary uses manifest-derived workflow name");
  }
  return warnings;
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function gitOutput(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function commandOutput(command: string, args: string[], cwd: string): string | null {
  try {
    return execFileSync(command, args, { cwd, encoding: "utf8", timeout: 30_000 }).trim();
  } catch {
    return null;
  }
}

function mergeNextflowInspect(summary: Summary, pipelineRoot: string, profile: string): void {
  const output = commandOutput(
    "nextflow",
    ["inspect", pipelineRoot, "-profile", profile, "-format", "json"],
    pipelineRoot,
  );
  if (!output) {
    summary.warnings.push("nextflow inspect unavailable or failed; static container parsing used");
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(output);
  } catch {
    summary.warnings.push(
      "nextflow inspect returned non-JSON output; static container parsing used",
    );
    return;
  }

  const inspected =
    (data as { processes?: { name?: string; container?: string }[] }).processes ?? [];
  for (const inspectedProcess of inspected) {
    if (!inspectedProcess.name || !inspectedProcess.container) continue;
    const shortName = inspectedProcess.name.split(":").at(-1);
    const process = summary.processes.find(
      (candidate) => candidate.name === inspectedProcess.name || candidate.name === shortName,
    );
    if (process) process.container = inspectedProcess.container;
  }
}

function normalizeGitUrl(url: string): string {
  const scpStyle = /^([^@]+@[^:]+):(.+)$/u.exec(url);
  if (scpStyle) return `ssh://${scpStyle[1]}/${scpStyle[2]}`;
  return url;
}

function parseWorkflowName(config: string): string {
  return (
    matchOne(config, /manifest\s*\{[\s\S]*?name\s*=\s*['"]([^'"]+)['"]/u) ?? "nextflow/unknown"
  );
}

function parseProfiles(config: string): string[] {
  const block = extractNamedBlock(config, "profiles");
  if (!block) return [];
  return [...block.matchAll(/^\s*([A-Za-z0-9_]+)\s*\{/gmu)]
    .map((match) => match[1]!)
    .filter((name) => name && name !== "profiles");
}

function parseParams(pipelineRoot: string): Param[] {
  const schemaPath = join(pipelineRoot, "nextflow_schema.json");
  if (!existsSync(schemaPath)) return [];
  const schema = JSON.parse(readText(schemaPath)) as {
    $defs?: Record<
      string,
      { required?: string[]; properties?: Record<string, Record<string, unknown>> }
    >;
  };
  const params = new Map<string, Param>();
  for (const section of Object.values(schema.$defs ?? {})) {
    const required = new Set(section.required ?? []);
    for (const [name, property] of Object.entries(section.properties ?? {})) {
      const type = Array.isArray(property.type)
        ? String(property.type[0])
        : String(property.type ?? "string");
      params.set(name, {
        name,
        type,
        default: property.default ?? null,
        description: typeof property.description === "string" ? property.description : undefined,
        required: required.has(name),
        enum: Array.isArray(property.enum) ? property.enum : undefined,
      });
    }
  }
  return [...params.values()];
}

function detectPipelineRoot(path: string): { path: string; warnings: string[] } {
  const requestedRoot = resolve(path);
  if (existsSync(join(requestedRoot, "nextflow.config"))) {
    return { path: requestedRoot, warnings: [] };
  }

  const configRoots = walk(requestedRoot, { maxDepth: 2 })
    .filter((candidate) => basename(candidate) === "nextflow.config")
    .map(dirname)
    .sort((left, right) =>
      relative(requestedRoot, left).localeCompare(relative(requestedRoot, right)),
    );
  if (configRoots[0]) {
    const sharedProcessFiles = discoverProcessFiles(requestedRoot).filter(
      (path) => !configRoots.some((configRoot) => path.startsWith(`${configRoot}${sep}`)),
    );
    if (sharedProcessFiles.length > 0) {
      return {
        path: requestedRoot,
        warnings: [
          `detected child Nextflow configs but kept repository root because shared process files exist outside child roots`,
          `multiple Nextflow pipeline roots found; selected .`,
        ],
      };
    }

    const warnings = [
      `auto-detected Nextflow pipeline root: ${relative(requestedRoot, configRoots[0]) || "."}`,
    ];
    if (configRoots.length > 1) {
      warnings.push(
        `multiple Nextflow pipeline roots found; selected ${relative(requestedRoot, configRoots[0]) || "."}`,
      );
    }
    return {
      path: configRoots[0],
      warnings,
    };
  }

  const workflowFiles = walk(requestedRoot)
    .filter(isNextflowSourceFile)
    .filter((candidate) => extractWorkflowBlocks(readText(candidate)).length > 0)
    .sort((left, right) => compareEntrypointCandidates(requestedRoot, left, right));
  if (workflowFiles[0]) {
    const detectedRoot = dirname(workflowFiles[0]);
    return {
      path: detectedRoot,
      warnings: [
        `auto-detected Nextflow pipeline root from workflow block: ${relative(requestedRoot, detectedRoot) || "."}`,
      ],
    };
  }

  throw new Error(`not a Nextflow pipeline root: ${path}`);
}

function discoverProcessFiles(pipelineRoot: string): string[] {
  return walk(pipelineRoot)
    .filter(isNextflowSourceFile)
    .filter((path) => /\bprocess\s+[A-Za-z0-9_]+\s*\{/u.test(readText(path)));
}

function walk(root: string, options: { maxDepth?: number } = {}, depth = 0): string[] {
  if (!existsSync(root)) return [];
  const paths: string[] = [];
  for (const entry of readdirSync(root).sort()) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      if (!shouldSkipDir(entry) && (options.maxDepth === undefined || depth < options.maxDepth)) {
        paths.push(...walk(path, options, depth + 1));
      }
    } else paths.push(path);
  }
  return paths;
}

function shouldSkipDir(name: string): boolean {
  return [
    ".git",
    ".nextflow",
    "work",
    "node_modules",
    "BioNextflow",
    "external-modules",
    "vendor",
    "vendors",
    "third_party",
  ].includes(name);
}

function isNextflowSourceFile(path: string): boolean {
  return path.endsWith(".nf");
}

function parseProcessFile(pipelineRoot: string, path: string): Process[] {
  const text = readText(path);
  return [...text.matchAll(/\bprocess\s+([A-Za-z0-9_]+)\s*\{/gu)].flatMap((match) => {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const body = extractBlockAt(text, openIndex);
    if (body === null) return [];
    const name = match[1]!;
    const moduleDir = dirname(path);
    const modulePath = relative(pipelineRoot, path);
    const isLocalModule = modulePath.startsWith(`modules${sep}local${sep}`);
    const container = normalizeDirective(
      matchOne(
        body,
        /container\s+"([\s\S]*?)"\s*(?:\n\s*input:|\n\s*output:|\n\s*when:|\n\s*script:)/u,
      ) ?? matchOne(body, /container\s+([^\n]+)/u),
    );
    const conda = normalizeDirective(matchOne(body, /conda\s+"([\s\S]*?)"/u));
    return {
      name,
      aliases: [],
      module_path: modulePath,
      meta: isLocalModule ? null : parseModuleMeta(join(moduleDir, "meta.yml")),
      module_tests: isLocalModule ? [] : parseNfTestsInDir(pipelineRoot, join(moduleDir, "tests")),
      tool: null,
      container,
      conda,
      inputs: parseIoBlock(body, "input"),
      outputs: parseIoBlock(body, "output"),
      when: normalizeDirective(matchOne(body, /when:\s*\n([\s\S]*?)\n\s*script:/u)),
      script_summary: summarizeScript(name),
      publish_dir: normalizeDirective(matchOne(body, /publishDir\s+([^\n]+)/u)),
    };
  });
}

function parseModuleMeta(path: string): ModuleMeta | null {
  if (!existsSync(path)) return null;
  const data = YAML.parse(readText(path)) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return null;
  return {
    description: typeof data.description === "string" ? data.description : undefined,
    keywords: stringArray(data.keywords),
    authors: stringArray(data.authors),
    maintainers: stringArray(data.maintainers),
    tools: parseNamedMetaEntries(data.tools),
    input: parseNamedMetaEntries(data.input),
    output: parseNamedMetaEntries(data.output),
  };
}

function parseNamedMetaEntries(value: unknown): ModuleMetaEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    return Object.entries(item as Record<string, unknown>).flatMap(([name, details]) => {
      if (!details || typeof details !== "object" || Array.isArray(details)) return [];
      const record = details as Record<string, unknown>;
      return {
        name,
        description: stringValue(record.description),
        homepage: stringValue(record.homepage),
        documentation: stringValue(record.documentation),
        tool_dev_url: stringValue(record.tool_dev_url),
        doi: stringValue(record.doi),
        licence: stringArray(record.licence),
        identifier: stringValue(record.identifier),
        type: stringValue(record.type),
        pattern: stringValue(record.pattern),
      };
    });
  });
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function selectEntrypoint(pipelineRoot: string): string | null {
  const candidates = walk(pipelineRoot)
    .filter(isNextflowSourceFile)
    .filter((candidate) => extractWorkflowBlocks(readText(candidate)).length > 0)
    .sort((left, right) => compareEntrypointCandidates(pipelineRoot, left, right));
  return candidates[0] ? relative(pipelineRoot, candidates[0]) : null;
}

function compareEntrypointCandidates(root: string, left: string, right: string): number {
  const leftBlocks = extractWorkflowBlocks(readText(left));
  const rightBlocks = extractWorkflowBlocks(readText(right));
  const leftAnonymousScore = leftBlocks.some((block) => block.name === null) ? 0 : 1;
  const rightAnonymousScore = rightBlocks.some((block) => block.name === null) ? 0 : 1;
  const leftNameScore = basename(left) === "main.nf" ? 0 : 1;
  const rightNameScore = basename(right) === "main.nf" ? 0 : 1;
  const leftDepth = relative(root, dirname(left)).split(sep).filter(Boolean).length;
  const rightDepth = relative(root, dirname(right)).split(sep).filter(Boolean).length;
  return (
    leftAnonymousScore - rightAnonymousScore ||
    leftNameScore - rightNameScore ||
    leftDepth - rightDepth ||
    relative(root, left).localeCompare(relative(root, right))
  );
}

function discoverProcessAliases(pipelineRoot: string): Map<string, string[]> {
  const aliases = new Map<string, Set<string>>();
  for (const path of walk(pipelineRoot).filter((candidate) => candidate.endsWith(".nf"))) {
    for (const include of parseIncludeItems(readText(path))) {
      if (!include.alias || include.alias === include.name) continue;
      const existing = aliases.get(include.name) ?? new Set<string>();
      existing.add(include.alias);
      aliases.set(include.name, existing);
    }
  }
  return new Map([...aliases.entries()].map(([name, values]) => [name, [...values].sort()]));
}

function parseWorkflows(pipelineRoot: string, processNames: string[]): ParsedWorkflow[] {
  const workflows = new Map<string, ParsedWorkflow>();
  const knownProcesses = new Set(processNames);
  for (const path of walk(pipelineRoot).filter((candidate) => candidate.endsWith(".nf"))) {
    const text = readText(path);
    const importedNames = new Set(
      parseIncludeItems(text).map((include) => include.alias ?? include.name),
    );
    for (const block of extractWorkflowBlocks(text)) {
      if (!block.name) continue;
      const calls = parseWorkflowCalls(block.body, new Set([...knownProcesses, ...importedNames]));
      workflows.set(block.name, {
        name: block.name,
        path: relative(pipelineRoot, path),
        kind: calls.length > 0 ? "pipeline" : "utility",
        calls,
        inputs: parseWorkflowIoBlock(block.body, "take"),
        outputs: parseWorkflowIoBlock(block.body, "emit"),
        tests: parseNfTestsInDir(pipelineRoot, join(dirname(path), "tests")),
        body: block.body,
      });
    }
  }
  return [...workflows.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function selectPrimaryWorkflow(workflows: ParsedWorkflow[]): ParsedWorkflow | null {
  return (
    [...workflows].sort((left, right) => {
      const callDiff = right.calls.length - left.calls.length;
      if (callDiff !== 0) return callDiff;
      const pathDiff =
        Number(right.path.startsWith("workflows/")) - Number(left.path.startsWith("workflows/"));
      if (pathDiff !== 0) return pathDiff;
      return left.name.localeCompare(right.name);
    })[0] ?? null
  );
}

function stripWorkflowBody(workflow: ParsedWorkflow): Subworkflow {
  const { body: _body, ...summaryWorkflow } = workflow;
  return summaryWorkflow;
}

function extractWorkflowBlocks(text: string): { name: string | null; body: string }[] {
  const blocks: { name: string | null; body: string }[] = [];
  const regex = /\bworkflow(?:\s+([A-Za-z0-9_]+))?\s*\{/gu;
  for (const match of text.matchAll(regex)) {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const body = extractBlockAt(text, openIndex);
    if (body !== null) blocks.push({ name: match[1] ?? null, body });
  }
  return blocks;
}

function parseWorkflowCalls(body: string, knownNames: Set<string>): string[] {
  const calls = new Set<string>();
  for (const match of body.matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*\(/gmu)) {
    const name = match[1]!;
    if (knownNames.has(name)) calls.add(name);
  }
  return [...calls].sort();
}

function parseWorkflowChannels(body: string): Channel[] {
  const channels = new Map<string, Channel>();
  for (const assignment of extractChannelAssignments(body)) {
    setPreferredChannel(channels, channelFromSource(assignment.name, assignment.source));
  }
  for (const setChain of extractSetChains(body)) {
    setPreferredChannel(channels, channelFromSource(setChain.name, setChain.source));
  }
  return [...channels.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function setPreferredChannel(channels: Map<string, Channel>, candidate: Channel): void {
  const existing = channels.get(candidate.name);
  if (
    !existing ||
    parseOperators(candidate.source).length > parseOperators(existing.source).length
  ) {
    channels.set(candidate.name, candidate);
  }
}

function extractChannelAssignments(body: string): { name: string; source: string }[] {
  const assignments: { name: string; source: string }[] = [];
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const start = /^\s*(ch_[A-Za-z0-9_]+)\s*=\s*(.+)$/u.exec(lines[index]!);
    if (!start) continue;
    const sourceLines = [start[2]!];
    for (let next = index + 1; next < lines.length; next += 1) {
      const line = lines[next]!;
      if (!/^\s*\./u.test(line)) break;
      sourceLines.push(line.trim());
      index = next;
    }
    assignments.push({
      name: start[1]!,
      source: normalizeWorkflowExpression(sourceLines.join(" ")),
    });
  }
  return assignments;
}

function extractSetChains(body: string): { name: string; source: string }[] {
  const chains: { name: string; source: string }[] = [];
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*(?:ch_|Channel\.)/u.test(lines[index]!)) continue;
    const sourceLines: string[] = [];
    for (let next = index; next < lines.length; next += 1) {
      const line = lines[next]!;
      if (
        next > index &&
        (/^\s*(?:take|main|emit):/u.test(line) ||
          /^\s*(?:if|else|[A-Z][A-Z0-9_]+\s*\()/u.test(line))
      ) {
        break;
      }
      sourceLines.push(line.trim());
      const setMatch = /\.set\s*\{\s*(ch_[A-Za-z0-9_]+)\s*\}/u.exec(line);
      if (setMatch) {
        const rawSource = sourceLines
          .join(" ")
          .replace(/\.set\s*\{\s*ch_[A-Za-z0-9_]+\s*\}.*/u, "");
        chains.push({ name: setMatch[1]!, source: normalizeWorkflowExpression(rawSource) });
        index = next;
        break;
      }
      if (next - index > 80) break;
    }
  }
  return chains;
}

function channelFromSource(name: string, source: string): Channel {
  const operators = parseOperators(source);
  return {
    name,
    source,
    shape: operators.length > 0 ? operators.join("|") : "channel",
  };
}

function parseOperators(source: string): string[] {
  return [...source.matchAll(/\.(branch|cross|dump|filter|join|map|mix|multiMap)\b/gu)].map(
    (match) => match[1]!,
  );
}

function normalizeWorkflowExpression(source: string): string {
  return source
    .replace(/\s+/gu, " ")
    .replace(/\s+\./gu, ".")
    .replace(/\s*,\s*/gu, ", ")
    .trim();
}

function parseWorkflowEdges(body: string, calls: string[]): Edge[] {
  const callNames = new Set(calls);
  const edges: Edge[] = [];
  for (const invocation of extractCallInvocations(body)) {
    if (!callNames.has(invocation.name)) continue;
    for (const argument of invocation.arguments) {
      edges.push({ from: argument, to: invocation.name, via: [] });
    }
  }
  return edges;
}

function parseWorkflowConditionals(body: string, calls: string[]): Conditional[] {
  const conditionals: Conditional[] = [];
  const callNames = new Set(calls);
  for (const block of extractIfBlocks(body)) {
    const defaultAffects = parseWorkflowCalls(block.defaultBody, callNames);
    if (defaultAffects.length > 0) {
      conditionals.push({ guard: block.guard, branch: "default", affects: defaultAffects });
    }
    const alternateAffects = block.alternateBody
      ? parseWorkflowCalls(block.alternateBody, callNames)
      : [];
    if (alternateAffects.length > 0) {
      conditionals.push({ guard: block.guard, branch: "alternate", affects: alternateAffects });
    }
  }
  return conditionals;
}

function extractIfBlocks(
  body: string,
): { guard: string; defaultBody: string; alternateBody: string | null }[] {
  const blocks: { guard: string; defaultBody: string; alternateBody: string | null }[] = [];
  for (const match of body.matchAll(/\bif\s*\(([^\n)]+)\)\s*\{/gu)) {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const defaultBody = extractBlockAt(body, openIndex);
    if (defaultBody === null) continue;
    const closeIndex = openIndex + defaultBody.length + 1;
    const elseMatch = /^\s*else\s*\{/u.exec(body.slice(closeIndex + 1));
    const alternateBody = elseMatch
      ? extractBlockAt(body, closeIndex + 1 + elseMatch[0].lastIndexOf("{"))
      : null;
    blocks.push({ guard: normalizeWorkflowExpression(match[1]!), defaultBody, alternateBody });
  }
  return blocks;
}

function extractCallInvocations(body: string): { name: string; arguments: string[] }[] {
  const invocations: { name: string; arguments: string[] }[] = [];
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const singleLine = /^\s*([A-Z][A-Z0-9_]+)\s*\(([^)]*)\)\s*$/u.exec(lines[index]!);
    if (singleLine) {
      invocations.push({
        name: singleLine[1]!,
        arguments: splitCallArguments(singleLine[2]!),
      });
      continue;
    }
    const start = /^\s*([A-Z][A-Z0-9_]+)\s*\(\s*$/u.exec(lines[index]!);
    if (!start) continue;
    const args: string[] = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index]!.trim();
      if (line === ")") break;
      const argument = line.replace(/,$/u, "").trim();
      if (argument && !argument.startsWith("//")) args.push(argument);
    }
    invocations.push({ name: start[1]!, arguments: args });
  }
  return invocations;
}

function splitCallArguments(text: string): string[] {
  return text
    .split(",")
    .map((argument) => argument.trim())
    .filter(Boolean);
}

function parseWorkflowIoBlock(text: string, blockName: "take" | "emit"): ChannelIO[] {
  const block = matchOne(
    text,
    new RegExp(`${blockName}:\\s*\\n([\\s\\S]*?)(?:\\n\\s*(?:take|main|emit):|$)`, "u"),
  );
  if (!block) return [];
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .map((line) => ({
      name:
        matchOne(line, /^([A-Za-z0-9_]+)\s*=/u) ??
        matchOne(line, /^([A-Za-z0-9_]+)/u) ??
        `io_${Math.abs(hash(line))}`,
      shape: line.replace(/\s+/gu, " "),
      topic: null,
    }));
}

function parseIncludeItems(text: string): { name: string; alias: string | null }[] {
  const items: { name: string; alias: string | null }[] = [];
  for (const match of text.matchAll(/include\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/gu)) {
    for (const item of match[1]!.split(";")) {
      const include = /^\s*([A-Za-z0-9_]+)(?:\s+as\s+([A-Za-z0-9_]+))?\s*$/u.exec(item);
      if (include) items.push({ name: include[1]!, alias: include[2] ?? null });
    }
  }
  return items;
}

function normalizeDirective(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/gu, " ").trim();
}

function parseIoBlock(text: string, blockName: "input" | "output"): ChannelIO[] {
  const block = matchOne(
    text,
    new RegExp(
      `${blockName}:\\s*\\n([\\s\\S]*?)(?:\\n\\s*(?:input|output|when|script|stub):|\\n\\})`,
      "u",
    ),
  );
  if (!block) return [];
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .map((line) => ({
      name: parseIoName(line, blockName),
      shape: line.replace(/\s+/gu, " "),
      topic: matchOne(line, /topic:\s*([A-Za-z0-9_]+)/u),
    }));
}

function parseIoName(line: string, blockName: "input" | "output"): string {
  return (
    matchOne(line, /emit:\s*([A-Za-z0-9_]+)/u) ??
    matchOne(line, /path\(?([A-Za-z0-9_]+)/u) ??
    matchOne(line, /val\(([A-Za-z0-9_]+)/u) ??
    `${blockName}_${Math.abs(hash(line))}`
  );
}

function buildTools(pipelineRoot: string, processes: Process[]): Tool[] {
  const tools = new Map<string, Tool>();
  for (const process of processes) {
    const envPath = join(pipelineRoot, dirname(process.module_path), "environment.yml");
    const containerStrings = [...(process.container ?? "").matchAll(/'([^']+)'/gu)]
      .map((match) => match[1]!)
      .filter((value) => value.includes(":") || value.includes("/"));
    for (const dependency of existsSync(envPath)
      ? parseBiocondaDependencies(readText(envPath))
      : []) {
      tools.set(dependency.name, {
        name: dependency.name,
        version: dependency.version,
        biocontainer: containerStrings.find((value) => value.includes("biocontainers/")) ?? null,
        bioconda: dependency.spec,
        docker: containerStrings.find((value) => !isKnownContainer(value)) ?? null,
        singularity:
          containerStrings.find(
            (value) =>
              value.includes("depot.galaxyproject.org/singularity") ||
              value.includes("community-cr-prod.seqera.io"),
          ) ?? null,
        wave: containerStrings.find((value) => value.includes("community.wave.seqera.io")) ?? null,
      });
    }
  }
  return [...tools.values()];
}

function parseBiocondaDependencies(
  text: string,
): { name: string; version: string; spec: string }[] {
  const data = YAML.parse(text) as { dependencies?: unknown[] } | null;
  return (data?.dependencies ?? [])
    .filter((dependency): dependency is string => typeof dependency === "string")
    .map(parseBiocondaDependency)
    .filter((dependency): dependency is { name: string; version: string; spec: string } =>
      Boolean(dependency),
    );
}

function parseBiocondaDependency(
  spec: string,
): { name: string; version: string; spec: string } | null {
  const match = /^bioconda::([A-Za-z0-9_.-]+)(?:=([^=\s]+))?/u.exec(spec);
  if (!match) return null;
  return { name: match[1]!, version: match[2] ?? "unknown", spec };
}

function isKnownContainer(value: string): boolean {
  return (
    value.includes("biocontainers/") ||
    value.includes("depot.galaxyproject.org/singularity") ||
    value.includes("community.wave.seqera.io") ||
    value.includes("community-cr-prod.seqera.io")
  );
}

function parseTestFixtures(pipelineRoot: string, profile: string): Summary["test_fixtures"] {
  const configPath = join(pipelineRoot, "conf", `${profile}.config`);
  const text = existsSync(configPath) ? readText(configPath) : "";
  const baseParams = parseParamAssignments(
    existsSync(join(pipelineRoot, "nextflow.config"))
      ? readText(join(pipelineRoot, "nextflow.config"))
      : "",
    new Map(),
  );
  const profileParams = parseParamAssignments(text, baseParams);
  const remoteInputs = [...profileParams.entries()]
    .filter(([name]) => isFixtureParam(name))
    .map(([name, value]) => ({ name, url: normalizeTestDataUrl(value) }))
    .filter((input): input is { name: string; url: string } => Boolean(input.url));
  return {
    profile,
    inputs: remoteInputs.map(({ name, url }) => ({
      role: inferParamRole(name, url),
      path: null,
      url,
      sha1: null,
      filetype: inferFiletype(url),
      description: `${name} from conf/${profile}.config`,
    })),
    outputs: [],
  };
}

function parseParamAssignments(
  text: string,
  baseParams: Map<string, string>,
  options: { changedOnly?: boolean } = {},
): Map<string, string> {
  const params = new Map(baseParams);
  const changed = new Map<string, string>();
  const block = extractNamedBlock(text, "params");
  if (!block) return options.changedOnly ? changed : params;
  for (const match of block.matchAll(/^\s*([A-Za-z0-9_]+)\s*=\s*([^\n]+)$/gmu)) {
    const value = resolveParamExpression(match[2]!.trim(), params);
    if (value) {
      params.set(match[1]!, value);
      changed.set(match[1]!, value);
    }
  }
  return options.changedOnly ? changed : params;
}

function isFixtureParam(name: string): boolean {
  return name === "input" || /(^reference_|_fasta$|_gff$|_gtf$|_bed$|_proteins$)/u.test(name);
}

function resolveParamExpression(expression: string, params: Map<string, string>): string | null {
  const literal = matchOne(expression, /^['"]([^'"]*)['"]/u);
  if (literal !== null) return literal;
  const concat = /^params\.([A-Za-z0-9_]+)\s*\+\s*['"]([^'"]+)['"]/u.exec(expression);
  if (!concat) return null;
  const prefix = params.get(concat[1]!);
  if (!prefix) return null;
  return joinUrlParts(prefix, concat[2]!);
}

function joinUrlParts(prefix: string, suffix: string): string {
  if (!/^https?:\/\//u.test(prefix)) return `${prefix}${suffix}`;
  const separator = prefix.endsWith("/") || suffix.startsWith("/") ? "" : "/";
  return `${prefix}${separator}${suffix}`;
}

function normalizeTestDataUrl(value: string): string | null {
  if (!/^https?:\/\//u.test(value)) return null;
  const nfCoreRaw =
    /^https:\/\/raw\.githubusercontent\.com\/nf-core\/test-datasets\/(?!refs\/heads\/)([^/]+)\/(.+)$/u.exec(
      value,
    );
  if (nfCoreRaw) {
    return `https://raw.githubusercontent.com/nf-core/test-datasets/refs/heads/${nfCoreRaw[1]}/${nfCoreRaw[2]}`;
  }
  return value;
}

async function fetchTestData(summary: Summary, testDataDir?: string): Promise<void> {
  const urls = new Set<string>();
  for (const input of summary.test_fixtures.inputs) {
    if (input.url) urls.add(input.url);
  }

  for (const input of summary.test_fixtures.inputs) {
    if (!input.url) continue;
    try {
      const content = await fetchText(input.url);
      input.sha1 = sha1(content);
      if (testDataDir) input.path = writeFetchedTestData(testDataDir, input.url, content);
      for (const url of extractRemoteUrls(content)) urls.add(url);
    } catch (err) {
      summary.warnings.push(`failed to fetch test fixture ${input.url}: ${formatError(err)}`);
    }
  }

  for (const url of urls) {
    if (
      summary.test_fixtures.inputs.some(
        (input) => input.url === url && input.role !== "samplesheet",
      )
    ) {
      continue;
    }
    if (summary.test_fixtures.inputs.some((input) => input.url === url && input.sha1)) continue;
    try {
      const bytes = await fetchBytes(url);
      summary.test_fixtures.inputs.push({
        role: inferTestDataRole(url),
        path: testDataDir ? writeFetchedTestData(testDataDir, url, bytes) : null,
        url,
        sha1: sha1(bytes),
        filetype: inferFiletype(url),
        description: "Referenced by fetched samplesheet",
      });
    } catch (err) {
      summary.warnings.push(`failed to fetch test data ${url}: ${formatError(err)}`);
    }
  }
}

function writeFetchedTestData(testDataDir: string, url: string, data: string | Uint8Array): string {
  const path = join(resolve(testDataDir), localTestDataPath(url));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  return path;
}

function localTestDataPath(url: string): string {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean).map(safePathPart);
  return join(safePathPart(parsed.hostname), ...parts);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return new Uint8Array(await response.arrayBuffer());
}

function extractRemoteUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^,\s]+/gu)].map((match) => match[0]!);
}

function sha1(data: string | Uint8Array): string {
  return createHash("sha1").update(data).digest("hex");
}

function inferTestDataRole(url: string): string {
  if (/samplesheet\.(csv|tsv|ya?ml|json)$/u.test(url)) return "samplesheet";
  if (/fastq\.gz$/u.test(url)) return "reads";
  return "test_data";
}

function inferParamRole(name: string, _url: string): string {
  if (name === "input") return "samplesheet";
  return name;
}

function safePathPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/gu, "_");
}

function inferFiletype(url: string): string | null {
  const name = url.split("/").at(-1) ?? "";
  if (name.endsWith(".tar.gz")) return "tar.gz";
  if (name.endsWith(".tgz")) return "tgz";
  if (name.endsWith(".gz")) {
    const stem = name.slice(0, -".gz".length);
    const extension = stem.split(".").at(-1);
    if (extension && extension !== stem && extension.length <= 8) return `${extension}.gz`;
    return "gz";
  }
  return name.includes(".") ? (name.split(".").at(-1) ?? null) : null;
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function parseNfTests(pipelineRoot: string): NfTest[] {
  return parseNfTestsInDir(pipelineRoot, join(pipelineRoot, "tests"));
}

function parseNfTestsInDir(pipelineRoot: string, testsRoot: string): NfTest[] {
  return walk(testsRoot)
    .filter((path) => path.endsWith(".nf.test"))
    .flatMap((path) => {
      const text = readText(path);
      const relPath = relative(pipelineRoot, path);
      const fileProfiles = parseNfTestFileProfiles(text);
      const blocks = extractNfTestBlocks(text);
      return blocks.map((block) => ({
        name: block.name,
        path: relPath,
        profiles: unique([...parseNfTestProfiles(block.body, block.name), ...fileProfiles]),
        params_overrides: parseParamsOverrides(block.body),
        assert_workflow_success: block.body.includes("workflow.success"),
        snapshot: parseSnapshot(path, relPath, block.body),
        prose_assertions: parseProseAssertions(block.body),
      }));
    });
}

function parseNfTestFileProfiles(text: string): string[] {
  return unique([...text.matchAll(/^\s*profile\s+["']([^"']+)["']/gmu)].map((match) => match[1]!));
}

function extractNfTestBlocks(text: string): { name: string; body: string }[] {
  const blocks: { name: string; body: string }[] = [];
  for (const match of text.matchAll(/\btest\("([^"]+)"\)\s*\{/gu)) {
    const openIndex = match.index + match[0].lastIndexOf("{");
    const body = extractBlockAt(text, openIndex);
    if (body !== null) blocks.push({ name: match[1]!, body });
  }
  return blocks.length > 0 ? blocks : [{ name: "unnamed", body: text }];
}

function parseNfTestProfiles(text: string, name: string): string[] {
  const profiles = new Set<string>();
  for (const source of [text, name]) {
    for (const match of source.matchAll(/-profile\s+([A-Za-z0-9_,]+)/gu)) {
      for (const profile of match[1]!.split(",")) profiles.add(profile);
    }
    for (const match of source.matchAll(/profile\s+["']([^"']+)["']/gu)) {
      profiles.add(match[1]!);
    }
  }
  return [...profiles];
}

function parseParamsOverrides(text: string): Record<string, unknown> {
  const block = matchOne(text, /params\s*\{([\s\S]*?)\}/u);
  const values: Record<string, unknown> = {};
  for (const match of block?.matchAll(/([A-Za-z0-9_]+)\s*=\s*"([^"]+)"/gu) ?? []) {
    values[match[1]!] = match[2]!;
  }
  return values;
}

function parseSnapshot(path: string, relPath: string, text: string): NfTest["snapshot"] {
  if (!text.includes("snapshot(")) return null;
  return {
    captures: parseSnapshotCaptures(text),
    helpers: unique(
      [...text.matchAll(/\b([A-Za-z0-9_]+)\(/gu)]
        .map((match) => match[1]!)
        .filter((value) => ["getAllFilesFromDir", "removeNextflowVersion"].includes(value)),
    ),
    ignore_files: [...text.matchAll(/ignoreFile:\s*['"]([^'"]+)['"]/gu)].map((match) => match[1]!),
    ignore_globs: [...text.matchAll(/ignore:\s*\[([^\]]+)\]/gu)].flatMap((match) =>
      [...match[1]!.matchAll(/['"]([^'"]+)['"]/gu)].map((inner) => inner[1]!),
    ),
    snap_path: existsSync(`${path}.snap`) ? `${relPath}.snap` : null,
  };
}

function parseSnapshotCaptures(text: string): string[] {
  const captures: string[] = [];
  if (/workflow\.trace\.succeeded\(\)\.size\(\)/u.test(text)) captures.push("succeeded_task_count");
  if (/removeNextflowVersion\(/u.test(text)) captures.push("versions_yml");
  for (const match of text.matchAll(/\b(stable_[A-Za-z0-9_]+)\b/gu)) {
    const capture = match[1]!
      .replace(/^stable_name$/u, "stable_names")
      .replace(/^stable_path$/u, "stable_paths");
    captures.push(capture);
  }
  return unique(captures);
}

function parseProseAssertions(text: string): string[] {
  return [...text.matchAll(/assert\s+(?!workflow\.success\b)([^}\n]+)/gu)]
    .map((match) => match[1]!.trim())
    .filter((assertion) => !assertion.startsWith("snapshot("));
}

function summarizeScript(name: string): string {
  const tool = name.toLowerCase().replace(/_/gu, " ");
  return `Run ${tool} and emit declared Nextflow outputs.`;
}

function extractNamedBlock(text: string, name: string): string | null {
  const startMatch = new RegExp(`\\b${name}\\s*\\{`, "u").exec(text);
  if (!startMatch) return null;
  const openIndex = text.indexOf("{", startMatch.index);
  const block = extractBlockAt(text, openIndex);
  return block === null ? null : text.slice(startMatch.index, openIndex + block.length + 2);
}

function extractBlockAt(text: string, openIndex: number): string | null {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, index);
    }
  }
  return null;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function matchOne(text: string, regex: RegExp): string | null {
  return regex.exec(text)?.[1] ?? null;
}

function hash(value: string): number {
  let result = 0;
  for (const char of value) result = (result << 5) - result + char.charCodeAt(0);
  return result;
}

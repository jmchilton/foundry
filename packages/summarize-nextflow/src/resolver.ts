import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

interface Summary {
  source: Record<string, unknown>;
  params: Param[];
  profiles: string[];
  tools: Tool[];
  processes: Process[];
  subworkflows: unknown[];
  workflow: { name: string; channels: unknown[]; edges: unknown[]; conditionals: unknown[] };
  test_fixtures: { profile: string; inputs: TestDataRef[]; outputs: unknown[] };
  nf_tests: NfTest[];
  warnings: string[];
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
  tool: string | null;
  container: string | null;
  conda: string | null;
  inputs: ChannelIO[];
  outputs: ChannelIO[];
  when: string | null;
  script_summary: string;
  publish_dir: string | null;
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
  if (!existsSync(join(pipelineRoot, "nextflow.config"))) {
    throw new Error(`not a Nextflow pipeline root: ${pipelineRoot}`);
  }

  const config = readText(join(pipelineRoot, "nextflow.config"));
  const workflowName = parseWorkflowName(config);
  const processes = discoverProcessFiles(pipelineRoot).map((path) =>
    parseProcessFile(pipelineRoot, path),
  );
  const tools = buildTools(pipelineRoot, processes);

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
      tool:
        tools.find((tool) => process.name.toLowerCase().includes(tool.name))?.name ?? process.tool,
    })),
    subworkflows: [],
    workflow: {
      name: workflowName.split("/").at(-1)?.toUpperCase() ?? "WORKFLOW",
      channels: [],
      edges: [],
      conditionals: [],
    },
    test_fixtures: parseTestFixtures(pipelineRoot, options.profile),
    nf_tests: parseNfTests(pipelineRoot),
    warnings: ["workflow graph extraction is intentionally minimal in resolver v0"],
  };

  if (options.withNextflow) mergeNextflowInspect(summary, pipelineRoot, options.profile);
  if (options.fetchTestData) await fetchTestData(summary, options.testDataDir);
  return summary;
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

function discoverProcessFiles(pipelineRoot: string): string[] {
  return walk(join(pipelineRoot, "modules")).filter((path) => basename(path) === "main.nf");
}

function walk(root: string): string[] {
  if (!existsSync(root)) return [];
  const paths: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) paths.push(...walk(path));
    else paths.push(path);
  }
  return paths;
}

function parseProcessFile(pipelineRoot: string, path: string): Process {
  const text = readText(path);
  const name =
    matchOne(text, /process\s+([A-Za-z0-9_]+)\s*\{/u) ?? basename(dirname(path)).toUpperCase();
  const container = normalizeDirective(
    matchOne(
      text,
      /container\s+"([\s\S]*?)"\s*(?:\n\s*input:|\n\s*output:|\n\s*when:|\n\s*script:)/u,
    ),
  );
  const conda = normalizeDirective(matchOne(text, /conda\s+"([\s\S]*?)"/u));
  return {
    name,
    aliases: [],
    module_path: relative(pipelineRoot, path),
    tool: null,
    container,
    conda,
    inputs: parseIoBlock(text, "input"),
    outputs: parseIoBlock(text, "output"),
    when: normalizeDirective(matchOne(text, /when:\s*\n([\s\S]*?)\n\s*script:/u)),
    script_summary: summarizeScript(name),
    publish_dir: normalizeDirective(matchOne(text, /publishDir\s+([^\n]+)/u)),
  };
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
    const bioconda = existsSync(envPath)
      ? matchOne(readText(envPath), /-\s*(bioconda::([A-Za-z0-9_.-]+)=([^\s]+))/u)
      : null;
    const name = bioconda ? matchOne(bioconda, /bioconda::([A-Za-z0-9_.-]+)=/u) : null;
    const version = bioconda ? matchOne(bioconda, /=([^\s]+)/u) : null;
    if (!name || !version) continue;
    const containerStrings = [...(process.container ?? "").matchAll(/'([^']+)'/gu)]
      .map((match) => match[1]!)
      .filter((value) => value.includes(":") || value.includes("/"));
    tools.set(name, {
      name,
      version,
      biocontainer: containerStrings.find((value) => value.includes("biocontainers/")) ?? null,
      bioconda,
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
  return [...tools.values()];
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
    readText(join(pipelineRoot, "nextflow.config")),
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
  const testsRoot = join(pipelineRoot, "tests");
  return walk(testsRoot)
    .filter((path) => path.endsWith(".nf.test"))
    .map((path) => {
      const text = readText(path);
      const relPath = relative(pipelineRoot, path);
      const name = matchOne(text, /test\("([^"]+)"\)/u) ?? basename(path);
      return {
        name,
        path: relPath,
        profiles: parseNfTestProfiles(text, name),
        params_overrides: parseParamsOverrides(text),
        assert_workflow_success: text.includes("workflow.success"),
        snapshot: text.includes("snapshot(")
          ? {
              captures: ["versions_yml", "stable_names", "stable_paths"],
              helpers: [...text.matchAll(/\b([A-Za-z0-9_]+)\(/gu)]
                .map((match) => match[1]!)
                .filter((value) => ["getAllFilesFromDir", "removeNextflowVersion"].includes(value)),
              ignore_files: [...text.matchAll(/ignoreFile:\s*['"]([^'"]+)['"]/gu)].map(
                (match) => match[1]!,
              ),
              ignore_globs: [...text.matchAll(/ignore:\s*\[([^\]]+)\]/gu)].flatMap((match) =>
                [...match[1]!.matchAll(/['"]([^'"]+)['"]/gu)].map((inner) => inner[1]!),
              ),
              snap_path: existsSync(`${path}.snap`) ? `${relPath}.snap` : null,
            }
          : null,
        prose_assertions: [],
      };
    });
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

function summarizeScript(name: string): string {
  const tool = name.toLowerCase().replace(/_/gu, " ");
  return `Run ${tool} and emit declared Nextflow outputs.`;
}

function extractNamedBlock(text: string, name: string): string | null {
  const startMatch = new RegExp(`\\b${name}\\s*\\{`, "u").exec(text);
  if (!startMatch) return null;
  let depth = 0;
  for (let index = startMatch.index; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(startMatch.index, index + 1);
    }
  }
  return null;
}

function matchOne(text: string, regex: RegExp): string | null {
  return regex.exec(text)?.[1] ?? null;
}

function hash(value: string): number {
  let result = 0;
  for (const char of value) result = (result << 5) - result + char.charCodeAt(0);
  return result;
}

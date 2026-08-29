import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RpcClient,
  VERSION as PI_VERSION,
  type JsonAgentSessionEvent,
  type RpcClientOptions,
  type RpcSessionState,
  type SessionStats,
} from "@earendil-works/pi-coding-agent";

const DEFAULT_TOOLS = ["read", "write", "edit", "bash", "grep", "find", "ls"];
const SUPPORTED_TOOLS = new Set([...DEFAULT_TOOLS, "powershell"]);
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARTIFACT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SandboxMode = "local";
export type RunStatus = "passed" | "failed" | "error" | "timed_out" | "cancelled";
export type PiThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface ExpectedArtifact {
  id: string;
  path: string;
}

export interface StagedInput {
  source: string;
  staged_path: string;
  sha256: string;
}

export interface ArtifactResult {
  id: string;
  path: string;
  status: "passed" | "present" | "missing" | "failed" | "error";
  sha256?: string;
  validator?: {
    bin: string;
    args: string[];
    exit_code: number | null;
    stdout_path: string;
    stderr_path: string;
    error?: string;
  };
}

export interface PiSkillRunRecord {
  run_schema_version: 1;
  run_id: string;
  status: RunStatus;
  failure_kind?: "infrastructure" | "skill";
  error?: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  engine: {
    name: "pi";
    version: string;
    provider: string;
    requested_model: string;
    requested_thinking?: PiThinkingLevel;
    resolved_model?: string;
  };
  invocation: {
    skill: string;
    skill_path: string;
    skill_sha256: string;
    provenance_sha256?: string;
    prompt_sha256: string;
    explicit_activation: string;
    tools: string[];
    timeout_ms: number;
    ambient_discovery_disabled: true;
  };
  sandbox: {
    mode: SandboxMode;
    security_boundary: false;
    network_policy: "host";
    credential_policy: "environment";
    workdir: string;
    agent_config_dir: string;
  };
  inputs: StagedInput[];
  artifacts: ArtifactResult[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    total_tokens: number;
    cost: number;
    turns: number;
    tool_calls: number;
  };
  final_output?: string;
  trace_path: string;
  stderr_path: string;
}

export interface RunPiSkillOptions {
  skillDir: string;
  prompt: string;
  inputPaths?: string[];
  expectedArtifacts?: ExpectedArtifact[];
  runDir: string;
  provider: string;
  model: string;
  thinking?: PiThinkingLevel;
  timeoutMs?: number;
  tools?: string[];
  sandbox?: SandboxMode;
  signal?: AbortSignal;
  onEvent?: (event: JsonAgentSessionEvent) => void;
}

interface PiClient {
  start(): Promise<void>;
  stop(): Promise<void>;
  abort(): Promise<void>;
  onEvent(listener: (event: JsonAgentSessionEvent) => void): () => void;
  promptAndWait(
    message: string,
    images?: never,
    timeout?: number,
  ): Promise<JsonAgentSessionEvent[]>;
  getStderr(): string;
  getState(): Promise<RpcSessionState>;
  getSessionStats(): Promise<SessionStats>;
  getLastAssistantText(): Promise<string | null>;
}

export interface PiRunnerDependencies {
  createClient?: (options: RpcClientOptions) => PiClient;
  now?: () => Date;
  id?: () => string;
}

interface VerifyEntry {
  artifact_id: string;
  validator_bin: string;
  args: string[];
}

interface VerifyManifest {
  verify_schema_version: number;
  entries: VerifyEntry[];
}

interface ProvenanceArtifact {
  id?: unknown;
  default_filename?: unknown;
}

interface ProvenanceManifest {
  artifacts?: { produces?: ProvenanceArtifact[] };
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function relativeRecordPath(runDir: string, filePath: string): string {
  return path.relative(runDir, filePath).split(path.sep).join("/");
}

function listTree(root: string, current = root): string[] {
  const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...listTree(root, fullPath));
    else files.push(path.relative(root, fullPath).split(path.sep).join("/"));
  }
  return files;
}

export function sha256Path(filePath: string): string {
  const resolved = realpathSync(filePath);
  const stat = lstatSync(resolved);
  if (stat.isFile()) return createHash("sha256").update(readFileSync(resolved)).digest("hex");
  if (!stat.isDirectory()) throw new Error(`cannot hash unsupported path: ${filePath}`);
  const hash = createHash("sha256");
  for (const relative of listTree(resolved)) {
    hash.update(relative);
    hash.update("\0");
    hash.update(readFileSync(path.join(resolved, relative)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function readSkillName(skillDir: string): string {
  const skillPath = path.join(skillDir, "SKILL.md");
  if (!existsSync(skillPath)) throw new Error(`${skillPath}: missing SKILL.md`);
  const source = readFileSync(skillPath, "utf8");
  const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  const name = frontmatter?.[1]?.match(/^name:\s*["']?([^\s"']+)["']?\s*$/m)?.[1];
  if (!name || !SKILL_NAME.test(name))
    throw new Error(`${skillPath}: invalid or missing skill name`);
  return name;
}

function resolveWorkspacePath(workspace: string, relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`expected artifact path must be relative: ${relativePath}`);
  }
  const resolved = path.resolve(workspace, relativePath);
  const relation = path.relative(workspace, resolved);
  if (relation.startsWith("..") || path.isAbsolute(relation)) {
    throw new Error(`path escapes worker directory: ${relativePath}`);
  }
  return resolved;
}

function makeReadOnly(filePath: string): void {
  const stat = lstatSync(filePath);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(filePath)) makeReadOnly(path.join(filePath, entry));
    chmodSync(filePath, 0o555);
  } else {
    chmodSync(filePath, 0o444);
  }
}

function stageInputs(inputPaths: string[], workspace: string): StagedInput[] {
  if (inputPaths.length === 0) return [];
  const inputsDir = path.join(workspace, "inputs");
  mkdirSync(inputsDir);
  const names = new Set<string>();
  return inputPaths.map((inputPath) => {
    const source = realpathSync(inputPath);
    const name = path.basename(source);
    if (names.has(name)) throw new Error(`declared inputs share basename '${name}'`);
    names.add(name);
    const destination = path.join(inputsDir, name);
    cpSync(source, destination, { recursive: true, dereference: true, force: false });
    makeReadOnly(destination);
    return {
      source,
      staged_path: path.relative(workspace, destination).split(path.sep).join("/"),
      sha256: sha256Path(source),
    };
  });
}

function loadVerifyEntries(skillDir: string): Map<string, VerifyEntry> {
  const verifyPath = path.join(skillDir, "_verify.json");
  if (!existsSync(verifyPath)) return new Map();
  const manifest = JSON.parse(readFileSync(verifyPath, "utf8")) as VerifyManifest;
  if (manifest.verify_schema_version !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error(`${verifyPath}: invalid verify manifest`);
  }
  return new Map(manifest.entries.map((entry) => [entry.artifact_id, entry]));
}

function substituteArtifactPath(args: string[], artifactPath: string): string[] {
  return args.length
    ? args.map((arg) => arg.replaceAll("{artifact_path}", artifactPath))
    : [artifactPath];
}

function validateArtifacts(
  expected: ExpectedArtifact[],
  workspace: string,
  runDir: string,
  skillDir: string,
): ArtifactResult[] {
  const verify = loadVerifyEntries(skillDir);
  const validationDir = path.join(runDir, "validation");
  return expected.map((artifact) => {
    if (!ARTIFACT_ID.test(artifact.id)) throw new Error(`invalid artifact id: ${artifact.id}`);
    const artifactPath = resolveWorkspacePath(workspace, artifact.path);
    const recordPath = path.relative(workspace, artifactPath).split(path.sep).join("/");
    if (!existsSync(artifactPath)) return { id: artifact.id, path: recordPath, status: "missing" };
    const result: ArtifactResult = {
      id: artifact.id,
      path: recordPath,
      status: "present",
      sha256: sha256Path(artifactPath),
    };
    const entry = verify.get(artifact.id);
    if (!entry) return result;
    mkdirSync(validationDir, { recursive: true });
    const executed = spawnSync(
      entry.validator_bin,
      substituteArtifactPath(entry.args, artifactPath),
      { cwd: workspace, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const stdoutPath = path.join(validationDir, `${artifact.id}.stdout`);
    const stderrPath = path.join(validationDir, `${artifact.id}.stderr`);
    writeFileSync(stdoutPath, executed.stdout ?? "");
    writeFileSync(stderrPath, executed.stderr ?? "");
    result.status = executed.error ? "error" : executed.status === 0 ? "passed" : "failed";
    result.validator = {
      bin: entry.validator_bin,
      args: substituteArtifactPath(entry.args, recordPath),
      exit_code: typeof executed.status === "number" ? executed.status : null,
      stdout_path: relativeRecordPath(runDir, stdoutPath),
      stderr_path: relativeRecordPath(runDir, stderrPath),
      error: executed.error?.message,
    };
    return result;
  });
}

function isAgentFailure(events: JsonAgentSessionEvent[]): boolean {
  return events.some((event) => {
    if (event.type !== "message_end" || event.message.role !== "assistant") return false;
    return event.message.stopReason === "error" || event.message.stopReason === "aborted";
  });
}

function invocationPrompt(skill: string, prompt: string, inputs: StagedInput[]): string {
  const inputNote = inputs.length
    ? `\n\nDeclared inputs staged in this worker:\n${inputs.map((input) => `- ${input.staged_path}`).join("\n")}`
    : "";
  return `/skill:${skill}\n\n${prompt}${inputNote}`;
}

function prepareRunDirectory(runDir: string): { workspace: string; agentDir: string } {
  if (existsSync(runDir)) throw new Error(`run directory already exists: ${runDir}`);
  mkdirSync(path.dirname(runDir), { recursive: true });
  mkdirSync(runDir);
  const workspace = path.join(runDir, "workspace");
  const agentDir = path.join(runDir, "pi-agent");
  mkdirSync(workspace);
  mkdirSync(agentDir);
  return { workspace, agentDir };
}

function writeRecord(runDir: string, record: PiSkillRunRecord): void {
  writeFileSync(path.join(runDir, "run.json"), `${JSON.stringify(record, null, 2)}\n`);
}

export function expectedArtifactsFromSkill(skillDir: string): ExpectedArtifact[] {
  const provenancePath = path.join(skillDir, "_provenance.json");
  if (!existsSync(provenancePath)) return [];
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8")) as ProvenanceManifest;
  const produces = provenance.artifacts?.produces ?? [];
  return produces.flatMap((artifact) =>
    typeof artifact.id === "string" && typeof artifact.default_filename === "string"
      ? [{ id: artifact.id, path: artifact.default_filename }]
      : [],
  );
}

export async function runPiSkill(
  options: RunPiSkillOptions,
  dependencies: PiRunnerDependencies = {},
): Promise<PiSkillRunRecord> {
  const now = dependencies.now ?? (() => new Date());
  const runId = (dependencies.id ?? randomUUID)();
  const started = now();
  const runDir = path.resolve(options.runDir);
  const skillDir = realpathSync(options.skillDir);
  const sandbox = options.sandbox ?? "local";
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const tools = [...(options.tools ?? DEFAULT_TOOLS)];
  if (!options.provider.trim() || !options.model.trim()) {
    throw new Error("provider and model are required");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeoutMs must be a positive finite number");
  }
  if (tools.length === 0 || tools.some((tool) => !SUPPORTED_TOOLS.has(tool))) {
    throw new Error(`tools must be a non-empty subset of: ${[...SUPPORTED_TOOLS].join(", ")}`);
  }
  const skill = readSkillName(skillDir);
  const expectedArtifacts = options.expectedArtifacts ?? expectedArtifactsFromSkill(skillDir);
  loadVerifyEntries(skillDir);
  const { workspace, agentDir } = prepareRunDirectory(runDir);
  for (const artifact of expectedArtifacts) {
    if (!ARTIFACT_ID.test(artifact.id)) throw new Error(`invalid artifact id: ${artifact.id}`);
    resolveWorkspacePath(workspace, artifact.path);
  }
  const inputs = stageInputs(options.inputPaths ?? [], workspace);
  const prompt = invocationPrompt(skill, options.prompt, inputs);
  const tracePath = path.join(runDir, "trace.jsonl");
  const stderrPath = path.join(runDir, "stderr.log");
  writeFileSync(tracePath, "");
  writeFileSync(stderrPath, "");

  const provenancePath = path.join(skillDir, "_provenance.json");
  const baseRecord = {
    run_schema_version: 1 as const,
    run_id: runId,
    started_at: started.toISOString(),
    engine: {
      name: "pi" as const,
      version: PI_VERSION,
      provider: options.provider,
      requested_model: options.model,
      requested_thinking: options.thinking,
    },
    invocation: {
      skill,
      skill_path: skillDir,
      skill_sha256: sha256Path(skillDir),
      provenance_sha256: existsSync(provenancePath) ? sha256Path(provenancePath) : undefined,
      prompt_sha256: sha256Text(prompt),
      explicit_activation: `/skill:${skill}`,
      tools,
      timeout_ms: timeoutMs,
      ambient_discovery_disabled: true as const,
    },
    sandbox: {
      mode: sandbox,
      security_boundary: false as const,
      network_policy: "host" as const,
      credential_policy: "environment" as const,
      workdir: relativeRecordPath(runDir, workspace),
      agent_config_dir: relativeRecordPath(runDir, agentDir),
    },
    inputs,
    trace_path: relativeRecordPath(runDir, tracePath),
    stderr_path: relativeRecordPath(runDir, stderrPath),
  };

  const cliPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent/rpc-entry"));
  const clientOptions: RpcClientOptions = {
    cliPath,
    cwd: workspace,
    env: { PI_CODING_AGENT_DIR: agentDir },
    provider: options.provider,
    model: options.model,
    args: [
      "--no-session",
      "--no-context-files",
      "--no-extensions",
      "--no-prompt-templates",
      "--no-skills",
      "--skill",
      skillDir,
      "--tools",
      tools.join(","),
      ...(options.thinking ? ["--thinking", options.thinking] : []),
    ],
  };
  const client = (dependencies.createClient ?? ((value) => new RpcClient(value)))(clientOptions);
  const events: JsonAgentSessionEvent[] = [];
  let state: RpcSessionState | undefined;
  let stats: SessionStats | undefined;
  let finalOutput: string | undefined;
  let status: RunStatus;
  let failureKind: PiSkillRunRecord["failure_kind"];
  let error: string | undefined;
  let timedOut = false;
  let cancelled = false;

  const unsubscribe = client.onEvent((event) => {
    events.push(event);
    writeFileSync(tracePath, `${JSON.stringify(event)}\n`, { flag: "a" });
    options.onEvent?.(event);
  });
  const abort = (): void => {
    cancelled = !timedOut;
    void client.abort().catch(() => undefined);
  };
  options.signal?.addEventListener("abort", abort, { once: true });

  try {
    await client.start();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        void client.abort().catch(() => undefined);
        reject(new Error(`Pi worker exceeded wall timeout of ${timeoutMs}ms`));
      }, timeoutMs);
    });
    try {
      await Promise.race([client.promptAndWait(prompt, undefined, timeoutMs), timeout]);
      if (options.signal?.aborted) throw new Error("Pi worker was cancelled");
    } finally {
      if (timer) clearTimeout(timer);
    }
    state = await client.getState();
    stats = await client.getSessionStats();
    finalOutput = (await client.getLastAssistantText()) ?? undefined;
    const artifacts = validateArtifacts(expectedArtifacts, workspace, runDir, skillDir);
    const artifactFailure = artifacts.some((artifact) =>
      ["missing", "failed", "error"].includes(artifact.status),
    );
    const agentFailure = isAgentFailure(events);
    status = artifactFailure || agentFailure ? "failed" : "passed";
    if (status === "failed") failureKind = "skill";
    const finished = now();
    const record: PiSkillRunRecord = {
      ...baseRecord,
      status,
      failure_kind: failureKind,
      finished_at: finished.toISOString(),
      duration_ms: finished.getTime() - started.getTime(),
      engine: {
        ...baseRecord.engine,
        resolved_model: state?.model ? `${state.model.provider}/${state.model.id}` : undefined,
      },
      artifacts,
      usage: stats
        ? {
            input_tokens: stats.tokens.input,
            output_tokens: stats.tokens.output,
            cache_read_tokens: stats.tokens.cacheRead,
            cache_write_tokens: stats.tokens.cacheWrite,
            total_tokens: stats.tokens.total,
            cost: stats.cost,
            turns: stats.assistantMessages,
            tool_calls: stats.toolCalls,
          }
        : undefined,
      final_output: finalOutput,
    };
    writeRecord(runDir, record);
    return record;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    status = timedOut ? "timed_out" : cancelled || options.signal?.aborted ? "cancelled" : "error";
    failureKind = status === "error" ? "infrastructure" : undefined;
    const artifacts = validateArtifacts(expectedArtifacts, workspace, runDir, skillDir);
    const finished = now();
    const record: PiSkillRunRecord = {
      ...baseRecord,
      status,
      failure_kind: failureKind,
      error,
      finished_at: finished.toISOString(),
      duration_ms: finished.getTime() - started.getTime(),
      artifacts,
    };
    writeRecord(runDir, record);
    return record;
  } finally {
    options.signal?.removeEventListener("abort", abort);
    unsubscribe();
    await client.stop().catch(() => undefined);
    writeFileSync(stderrPath, client.getStderr());
  }
}

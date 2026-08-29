import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { RpcClientOptions } from "@earendil-works/pi-coding-agent";
import { describe, expect, test } from "vitest";

import {
  expectedArtifactsFromSkill,
  runPiSkill,
  sha256Path,
  type PiRunnerDependencies,
} from "../src/index.js";

function fixtureRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "foundry-pi-runner-test-"));
}

function makeSkill(root: string): string {
  const skillDir = path.join(root, "skills", "example-skill");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: example-skill\ndescription: Example.\n---\n\n# Example\n",
  );
  writeFileSync(
    path.join(skillDir, "_provenance.json"),
    JSON.stringify({
      artifacts: { produces: [{ id: "example-output", default_filename: "output.json" }] },
    }),
  );
  writeFileSync(
    path.join(skillDir, "_verify.json"),
    JSON.stringify({
      verify_schema_version: 1,
      entries: [
        {
          artifact_id: "example-output",
          validator_bin: process.execPath,
          args: [
            "-e",
            "const fs=require('node:fs'); JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));",
            "{artifact_path}",
          ],
        },
      ],
    }),
  );
  return skillDir;
}

function fakeDependencies(
  onPrompt: (prompt: string, options: RpcClientOptions) => void | Promise<void>,
  capture: { options?: RpcClientOptions; prompt?: string; aborted?: boolean } = {},
): PiRunnerDependencies {
  return {
    id: () => "00000000-0000-4000-8000-000000000000",
    createClient: (options) => {
      capture.options = options;
      let listener: (event: never) => void = () => undefined;
      return {
        async start() {},
        async stop() {},
        async abort() {
          capture.aborted = true;
        },
        onEvent: (nextListener) => {
          listener = nextListener;
          return () => undefined;
        },
        async promptAndWait(prompt) {
          capture.prompt = prompt;
          listener({ type: "agent_start" } as never);
          await onPrompt(prompt, options);
          return [];
        },
        getStderr: () => "diagnostic stderr",
        async getState() {
          return {
            model: { provider: "test-provider", id: "resolved-model" },
            thinkingLevel: "medium",
            isStreaming: false,
            isCompacting: false,
            steeringMode: "one-at-a-time",
            followUpMode: "one-at-a-time",
            sessionId: "ephemeral",
            autoCompactionEnabled: false,
            messageCount: 2,
            pendingMessageCount: 0,
          } as never;
        },
        async getSessionStats() {
          return {
            sessionFile: undefined,
            sessionId: "ephemeral",
            userMessages: 1,
            assistantMessages: 1,
            toolCalls: 2,
            toolResults: 2,
            totalMessages: 4,
            tokens: {
              input: 10,
              output: 20,
              cacheRead: 3,
              cacheWrite: 4,
              total: 37,
            },
            cost: 0.01,
          };
        },
        async getLastAssistantText() {
          return "done";
        },
      };
    },
  };
}

describe("runPiSkill", () => {
  test("runs one explicitly loaded skill with ambient discovery disabled", async () => {
    const root = fixtureRoot();
    const skillDir = makeSkill(root);
    const inputDir = path.join(root, "source-pipeline");
    mkdirSync(inputDir);
    writeFileSync(path.join(inputDir, "main.nf"), "workflow { }\n");
    const runDir = path.join(root, "runs", "run-1");
    const capture: { options?: RpcClientOptions; prompt?: string } = {};
    const eventTypes: string[] = [];
    const dependencies = fakeDependencies((_prompt, options) => {
      writeFileSync(path.join(options.cwd!, "output.json"), '{"ok":true}\n');
    }, capture);

    const record = await runPiSkill(
      {
        skillDir,
        prompt: "Summarize the declared pipeline.",
        inputPaths: [inputDir],
        runDir,
        provider: "test-provider",
        model: "requested-model",
        thinking: "high",
        onEvent: (event) => eventTypes.push(event.type),
      },
      dependencies,
    );

    expect(record.status).toBe("passed");
    expect(record.engine.resolved_model).toBe("test-provider/resolved-model");
    expect(record.engine.requested_thinking).toBe("high");
    expect(record.artifacts).toEqual([
      expect.objectContaining({ id: "example-output", path: "output.json", status: "passed" }),
    ]);
    expect(record.inputs).toEqual([
      expect.objectContaining({ staged_path: "inputs/source-pipeline" }),
    ]);
    expect(capture.prompt).toContain("/skill:example-skill");
    expect(capture.prompt).toContain("inputs/source-pipeline");
    expect(capture.options?.args).toEqual([
      "--no-session",
      "--no-context-files",
      "--no-extensions",
      "--no-prompt-templates",
      "--no-skills",
      "--skill",
      realpathSync(skillDir),
      "--tools",
      "read,write,edit,bash,grep,find,ls",
      "--thinking",
      "high",
    ]);
    expect(capture.options?.env?.PI_CODING_AGENT_DIR).toBe(path.join(runDir, "pi-agent"));
    expect(eventTypes).toEqual(["agent_start"]);
    expect(readFileSync(path.join(runDir, "trace.jsonl"), "utf8")).toContain("agent_start");
    expect(statSync(path.join(runDir, "workspace", "inputs", "source-pipeline")).mode & 0o777).toBe(
      0o555,
    );
    expect(JSON.parse(readFileSync(path.join(runDir, "run.json"), "utf8"))).toEqual(record);
    expect(readFileSync(path.join(runDir, "stderr.log"), "utf8")).toBe("diagnostic stderr");
  });

  test("classifies a missing declared artifact as a skill failure", async () => {
    const root = fixtureRoot();
    const record = await runPiSkill(
      {
        skillDir: makeSkill(root),
        prompt: "Do the work.",
        runDir: path.join(root, "run"),
        provider: "test-provider",
        model: "test-model",
      },
      fakeDependencies(() => undefined),
    );

    expect(record.status).toBe("failed");
    expect(record.failure_kind).toBe("skill");
    expect(record.artifacts[0]?.status).toBe("missing");
  });

  test("enforces a wall timeout and aborts the worker", async () => {
    const root = fixtureRoot();
    const capture: { aborted?: boolean } = {};
    const record = await runPiSkill(
      {
        skillDir: makeSkill(root),
        prompt: "Never finish.",
        expectedArtifacts: [],
        runDir: path.join(root, "run"),
        provider: "test-provider",
        model: "test-model",
        timeoutMs: 5,
      },
      fakeDependencies(() => new Promise<void>(() => undefined), capture),
    );

    expect(record.status).toBe("timed_out");
    expect(capture.aborted).toBe(true);
    expect(record.error).toContain("wall timeout");
  });
});

describe("skill manifests", () => {
  test("derives expected artifacts from cast provenance", () => {
    const root = fixtureRoot();
    expect(expectedArtifactsFromSkill(makeSkill(root))).toEqual([
      { id: "example-output", path: "output.json" },
    ]);
  });

  test("hashes file contents rather than filesystem metadata", () => {
    const root = fixtureRoot();
    const first = path.join(root, "first.txt");
    const second = path.join(root, "second.txt");
    writeFileSync(first, "same\n");
    writeFileSync(second, "same\n");
    chmodSync(second, 0o600);
    expect(sha256Path(first)).toBe(sha256Path(second));
  });
});

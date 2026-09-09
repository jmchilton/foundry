import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PiSkillRunRecord, RunPiSkillOptions } from "@galaxy-foundry/gxwf-pi-harness";
import { expect, test } from "vitest";

import { defaultTestPipelineRunDir, runLinearPipeline } from "../src/commands/test-pipeline.js";

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeSkill(
  root: string,
  name: string,
  consumes: string[],
  produces: Array<{ id: string; default_filename: string }>,
): void {
  const skillDir = path.join(root, "casts", "claude", "skills", name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(skillDir + "/SKILL.md", `---\nname: ${name}\ndescription: test\n---\n`);
  writeJson(skillDir + "/_provenance.json", {
    artifacts: {
      consumes: consumes.map((id) => ({ id })),
      produces,
    },
  });
}

function fixtureRepo(): string {
  const root = mkdtempSync(path.join(tmpdir(), "foundry-test-pipeline-"));
  const pipelineDir = path.join(root, "content", "pipelines", "demo-pipeline");
  mkdirSync(pipelineDir, { recursive: true });
  writeFileSync(
    path.join(pipelineDir, "scenarios.md"),
    "# Scenarios\n\n## Case: tiny journey\n\n- fixture: `workflow-fixtures/pipelines/tiny`\n- expect: success\n",
  );
  mkdirSync(path.join(root, "workflow-fixtures", "pipelines", "tiny"), { recursive: true });
  writeFileSync(
    path.join(root, "workflow-fixtures", "pipelines", "tiny", "main.nf"),
    "nextflow.enable.dsl=2\n",
  );

  writeJson(
    path.join(root, "casts", "claude", "skills", "pipeline-demo-pipeline", "_assembly.json"),
    {
      source_pipeline: "demo-pipeline",
      source_revision: 1,
      harness_name: "pipeline-demo-pipeline",
      phases: [
        { phase: 1, kind: "mold", skill: "summarize", cast_present: true, loop: false },
        { phase: 2, kind: "mold", skill: "design", cast_present: true, loop: false },
        { phase: 3, kind: "branch", pattern: "unsupported", chain: ["finish"] },
      ],
    },
  );
  writeSkill(
    root,
    "summarize",
    [],
    [
      { id: "summary", default_filename: "summary.json" },
      { id: "unused", default_filename: "unused.txt" },
    ],
  );
  writeSkill(
    root,
    "design",
    ["summary", "optional-ledger"],
    [{ id: "design", default_filename: "design.md" }],
  );
  return root;
}

function fakeRecord(options: RunPiSkillOptions, skill: string): PiSkillRunRecord {
  return {
    run_schema_version: 1,
    run_id: `${skill}-run`,
    status: "passed",
    started_at: "2026-09-09T00:00:00.000Z",
    finished_at: "2026-09-09T00:00:01.000Z",
    duration_ms: 1000,
    engine: {
      name: "pi",
      version: "test",
      provider: options.provider,
      requested_model: options.model,
    },
    invocation: {
      skill,
      skill_path: options.skillDir,
      skill_sha256: "skill-hash",
      prompt_sha256: "prompt-hash",
      explicit_activation: `/skill:${skill}`,
      tools: [],
      timeout_ms: options.timeoutMs ?? 600000,
      ambient_discovery_disabled: true,
    },
    sandbox: {
      mode: "local",
      security_boundary: false,
      network_policy: "host",
      credential_policy: "ambient-environment",
      credential_auth_store: options.piTestAuthDir ? "pi-test-auth" : "none",
      workdir: "workspace",
      agent_config_dir: "pi-agent",
    },
    inputs: [],
    artifacts: (options.expectedArtifacts ?? []).map((artifact) => ({
      ...artifact,
      status: "present",
      sha256: createHash("sha256").update(artifact.id).digest("hex"),
    })),
    trace_path: "trace.jsonl",
    stderr_path: "stderr.log",
  };
}

test("test-pipeline defaults to a unique OS-temporary run directory", () => {
  expect(
    defaultTestPipelineRunDir(
      "nextflow-to-galaxy",
      new Date("2026-09-09T12:34:56.789Z"),
      "00000000-0000-4000-8000-000000000000",
    ),
  ).toBe(
    path.join(
      tmpdir(),
      "foundry-pi-pipeline-run-nextflow-to-galaxy-2026-09-09T12-34-56-789Z-00000000-0000-4000-8000-000000000000",
    ),
  );
});

test("runs a linear prefix in fresh workers with declared artifact handoffs", async () => {
  const root = fixtureRepo();
  const runDir = path.join(root, "runs", "linear");
  const calls: RunPiSkillOptions[] = [];

  const record = await runLinearPipeline(
    {
      repoRoot: root,
      pipeline: "demo-pipeline",
      scenario: "tiny journey",
      through: "2",
      trials: 2,
      runDir,
      provider: "openai-codex",
      model: "test-model",
      sandbox: "local",
      timeoutMs: 1000,
      credentialEnv: [],
      sandboxNetwork: "none",
      piTestAuthDir: "/test/pi-test-auth",
    },
    {
      runSkill: async (options) => {
        calls.push(options);
        const skill = path.basename(options.skillDir);
        const workspace = path.join(options.runDir, "workspace");
        mkdirSync(workspace, { recursive: true });
        for (const artifact of options.expectedArtifacts ?? []) {
          writeFileSync(path.join(workspace, artifact.path), artifact.id);
        }
        return fakeRecord(options, skill);
      },
      now: () => new Date("2026-09-09T00:00:00.000Z"),
      id: () => "pipeline-run-id",
    },
  );

  expect(record.status).toBe("passed");
  expect(record.trials).toHaveLength(2);
  expect(record.trials[0]?.phases.map((phase) => phase.skill)).toEqual(["summarize", "design"]);
  expect(record.trials[1]?.phases.map((phase) => phase.skill)).toEqual(["summarize", "design"]);
  expect(record.trials[0]?.phases[1]?.missing_input_ids).toEqual(["optional-ledger"]);
  expect(record.trials[0]?.phases[1]?.resolved_inputs).toEqual([
    expect.objectContaining({
      id: "summary",
      path: "trial-001/phase-001-summarize/workspace/summary.json",
      producer_phase: 1,
    }),
  ]);
  expect(calls).toHaveLength(4);
  expect(calls.every((call) => call.piTestAuthDir === "/test/pi-test-auth")).toBe(true);
  expect(record.sandbox.credential_auth_store).toBe("pi-test-auth");
  expect(calls[0]?.inputPaths).toEqual([path.join(root, "workflow-fixtures", "pipelines", "tiny")]);
  expect(calls[1]?.inputPaths).toEqual([
    path.join(runDir, "trial-001", "phase-001-summarize", "workspace", "summary.json"),
  ]);
  expect(calls[1]?.inputPaths).not.toContain(
    path.join(runDir, "trial-001", "phase-001-summarize", "workspace", "unused.txt"),
  );
  expect(calls[2]?.inputPaths).toEqual([path.join(root, "workflow-fixtures", "pipelines", "tiny")]);
  expect(calls[3]?.inputPaths).toEqual([
    path.join(runDir, "trial-002", "phase-001-summarize", "workspace", "summary.json"),
  ]);

  const written = JSON.parse(readFileSync(path.join(runDir, "run.json"), "utf8"));
  expect(written.run_id).toBe("pipeline-run-id");
  expect(written.through_phase).toBe(2);
});

test("preflights unsupported control flow before launching a worker", async () => {
  const root = fixtureRepo();
  let launched = false;

  await expect(
    runLinearPipeline(
      {
        repoRoot: root,
        pipeline: "demo-pipeline",
        scenario: "tiny journey",
        trials: 1,
        runDir: path.join(root, "runs", "unsupported"),
        provider: "test-provider",
        model: "test-model",
        sandbox: "local",
        timeoutMs: 1000,
        credentialEnv: [],
        sandboxNetwork: "none",
      },
      {
        runSkill: async () => {
          launched = true;
          throw new Error("must not launch");
        },
      },
    ),
  ).rejects.toThrow(
    "phase 3 uses unsupported branch control flow; select an earlier --through phase",
  );
  expect(launched).toBe(false);
});

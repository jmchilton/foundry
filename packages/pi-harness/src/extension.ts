import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { runPiSkill, type ExpectedArtifact } from "./runner.js";
import { resolveDeclaredInput, resolveInstalledSkill } from "./skill-resolution.js";

const FoundrySubagentParams = Type.Object({
  skill: Type.String({ description: "Published Foundry skill name" }),
  task: Type.String({ description: "One phase-sized task for the selected skill" }),
  inputs: Type.Optional(
    Type.Array(Type.String(), { description: "Declared input paths relative to the Pipeline run" }),
  ),
  expected_artifacts: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.String({ description: "Published artifact id" }),
        path: Type.String({ description: "Expected output path relative to the worker" }),
      }),
      { description: "Expected published artifact contracts; defaults to cast provenance" },
    ),
  ),
});

const foundrySubagent = defineTool({
  name: "foundry_subagent",
  label: "Foundry subagent",
  description:
    "Run exactly one named published Foundry skill in a fresh Pi worker. The caller chooses the skill and order.",
  promptSnippet: "Run one named published Foundry skill in an isolated child session.",
  executionMode: "sequential",
  parameters: FoundrySubagentParams,

  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    const skillsRoot = process.env.FOUNDRY_SKILLS_DIR;
    if (!skillsRoot) {
      return {
        content: [{ type: "text", text: "FOUNDRY_SKILLS_DIR is not configured." }],
        details: null,
      };
    }
    if ((process.env.FOUNDRY_SANDBOX ?? "local") !== "local") {
      return {
        content: [{ type: "text", text: "Only the local sandbox backend is implemented." }],
        details: null,
      };
    }
    try {
      const skillDir = resolveInstalledSkill(skillsRoot, params.skill);
      const inputPaths = (params.inputs ?? []).map((input) => resolveDeclaredInput(ctx.cwd, input));
      const expectedArtifacts: ExpectedArtifact[] | undefined = params.expected_artifacts;
      const runsRoot = path.resolve(
        process.env.FOUNDRY_RUNS_DIR ?? path.join(tmpdir(), "foundry-pi-runs"),
      );
      mkdirSync(runsRoot, { recursive: true });
      const runDir = path.join(runsRoot, `${params.skill}-${randomUUID()}`);
      const model = ctx.model;
      if (!model) throw new Error("the parent Pi session has no selected model");
      let eventCount = 0;
      const record = await runPiSkill({
        skillDir,
        prompt: params.task,
        inputPaths,
        expectedArtifacts,
        runDir,
        provider: model.provider,
        model: model.id,
        thinking: ctx.thinkingLevel,
        timeoutMs: Number(process.env.FOUNDRY_WORKER_TIMEOUT_MS ?? 600_000),
        signal,
        onEvent: (event) => {
          eventCount += 1;
          onUpdate?.({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  skill: params.skill,
                  status: "running",
                  event_count: eventCount,
                  last_event: event.type,
                }),
              },
            ],
            details: { skill: params.skill, event_count: eventCount, last_event: event.type },
          });
        },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              skill: params.skill,
              status: record.status,
              artifacts: record.artifacts,
              run_record: path.join(runDir, "run.json"),
              summary: record.final_output,
            }),
          },
        ],
        details: record,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
        details: null,
      };
    }
  },
});

export default function foundryPiHarness(pi: ExtensionAPI): void {
  pi.registerTool(foundrySubagent);
}

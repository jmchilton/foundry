import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RpcClient } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";

test("the pinned Pi RPC runtime loads only the explicitly supplied skill", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "foundry-pi-rpc-test-"));
  const agentDir = path.join(root, "agent");
  const skillDir = path.join(root, "skills", "example-skill");
  mkdirSync(agentDir);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: example-skill\ndescription: RPC fixture.\n---\n\n# Example\n",
  );
  const cliPath = fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent/rpc-entry"));
  const client = new RpcClient({
    cliPath,
    cwd: root,
    env: { PI_CODING_AGENT_DIR: agentDir },
    args: [
      "--no-session",
      "--no-context-files",
      "--no-extensions",
      "--no-prompt-templates",
      "--no-skills",
      "--skill",
      skillDir,
    ],
  });

  try {
    await client.start();
    const skills = (await client.getCommands()).filter((command) => command.source === "skill");
    expect(skills.map((skill) => skill.name)).toEqual(["skill:example-skill"]);
  } finally {
    await client.stop();
  }
}, 10_000);

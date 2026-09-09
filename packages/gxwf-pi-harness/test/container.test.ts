import { describe, expect, test } from "vitest";

import { buildDockerRunArgs, type ContainerLaunchConfig } from "../src/index.js";

describe("container RPC transport", () => {
  test("constructs a disposable least-privilege Docker worker", () => {
    const config: ContainerLaunchConfig = {
      docker_bin: "docker",
      container_name: "foundry-pi-run",
      image_id: "sha256:abc123",
      network: "bridge",
      credential_env: ["ANTHROPIC_API_KEY"],
      user: "1000:1000",
      mounts: [
        {
          type: "bind",
          source: "/checkout/casts/claude/skills/example-skill",
          target: "/skill",
          read_only: true,
          purpose: "skill",
        },
        {
          type: "bind",
          source: "/runs/run-1/inputs",
          target: "/inputs",
          read_only: true,
          purpose: "inputs",
        },
        {
          type: "bind",
          source: "/runs/run-1/workspace",
          target: "/workspace",
          read_only: false,
          purpose: "output",
        },
        {
          type: "tmpfs",
          target: "/pi-agent",
          read_only: false,
          purpose: "agent-config",
        },
        {
          type: "tmpfs",
          target: "/tmp",
          read_only: false,
          purpose: "temporary-files",
        },
      ],
    };

    const args = buildDockerRunArgs(config, ["--mode", "rpc", "--skill", "/skill"]);

    expect(args).toContain("--rm");
    expect(args).toContain("--interactive");
    expect(args).toContain("--pull=never");
    expect(args).toContain("--read-only");
    expect(args).toContain("--cap-drop=ALL");
    expect(args).toContain("--security-opt=no-new-privileges");
    expect(args).toContain("--network=bridge");
    expect(args).toContain("--user=1000:1000");
    expect(args).toContain(
      "type=bind,src=/checkout/casts/claude/skills/example-skill,dst=/skill,readonly,bind-recursive=disabled",
    );
    expect(args).toContain(
      "type=bind,src=/runs/run-1/inputs,dst=/inputs,readonly,bind-recursive=disabled",
    );
    expect(args).toContain("type=bind,src=/runs/run-1/workspace,dst=/workspace");
    expect(args).toContain("/pi-agent:rw,nosuid,nodev,size=64m,mode=1777");
    expect(args).toContain("--env=PI_CODING_AGENT_DIR=/pi-agent");
    expect(args).toContain("ANTHROPIC_API_KEY");
    expect(args).not.toContain("OPENAI_API_KEY");
    expect(args.slice(-5)).toEqual(["sha256:abc123", "--mode", "rpc", "--skill", "/skill"]);
  });
});

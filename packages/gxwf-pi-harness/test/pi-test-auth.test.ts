import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { defaultPiTestAuthDir, inspectPiTestAuth, piTestAuthPath } from "../src/index.js";

describe("pi-test-auth", () => {
  test("uses a Foundry-specific XDG configuration directory", () => {
    expect(defaultPiTestAuthDir({ XDG_CONFIG_HOME: "/config" }, "/home/alice")).toBe(
      "/config/galaxy-foundry/pi-test-auth",
    );
    expect(defaultPiTestAuthDir({}, "/home/alice")).toBe(
      "/home/alice/.config/galaxy-foundry/pi-test-auth",
    );
  });

  test("reports only non-secret credential metadata", () => {
    const root = mkdtempSync(path.join(tmpdir(), "foundry-pi-test-auth-"));
    mkdirSync(root, { recursive: true });
    writeFileSync(
      piTestAuthPath(root),
      JSON.stringify({
        "openai-codex": {
          type: "oauth",
          access: "access-secret-must-not-escape",
          refresh: "refresh-secret-must-not-escape",
          expires: Date.now() + 60_000,
          accountId: "account-123",
        },
      }),
      { mode: 0o600 },
    );

    const status = inspectPiTestAuth(root);
    expect(status).toEqual({
      auth_dir: root,
      provider: "openai-codex",
      configured: true,
      type: "oauth",
      account_id: "account-123",
      expires_at: expect.any(String),
    });
    expect(JSON.stringify(status)).not.toContain("access-secret");
    expect(JSON.stringify(status)).not.toContain("refresh-secret");
    expect(readFileSync(piTestAuthPath(root), "utf8")).toContain("access-secret");
  });

  test("reports a missing store without creating it", () => {
    const root = path.join(tmpdir(), `missing-pi-test-auth-${process.pid}-${Date.now()}`);
    expect(inspectPiTestAuth(root)).toEqual({
      auth_dir: root,
      provider: "openai-codex",
      configured: false,
    });
  });
});

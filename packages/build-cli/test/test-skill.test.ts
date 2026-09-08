import { tmpdir } from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { defaultTestSkillRunDir } from "../src/commands/test-skill.js";

test("test-skill defaults to a unique OS-temporary run directory", () => {
  const runDir = defaultTestSkillRunDir(
    "summarize-nextflow",
    new Date("2026-08-29T12:34:56.789Z"),
    "00000000-0000-4000-8000-000000000000",
  );

  expect(runDir).toBe(
    path.join(
      tmpdir(),
      "foundry-pi-run-summarize-nextflow-2026-08-29T12-34-56-789Z-00000000-0000-4000-8000-000000000000",
    ),
  );
  expect(path.relative(process.cwd(), runDir).startsWith("..")).toBe(true);
});

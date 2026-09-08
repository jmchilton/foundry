import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { resolveDeclaredInput, resolveInstalledSkill } from "../src/index.js";

function fixtureRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "foundry-pi-resolution-test-"));
}

describe("resolveInstalledSkill", () => {
  test("accepts direct children of the installed Foundry skill root", () => {
    const root = fixtureRoot();
    const skills = path.join(root, "skills");
    const skill = path.join(skills, "summarize-nextflow");
    mkdirSync(skill, { recursive: true });
    expect(resolveInstalledSkill(skills, "summarize-nextflow")).toBe(realpathSync(skill));
  });

  test("rejects paths and symlinks outside the installed skill root", () => {
    const root = fixtureRoot();
    const skills = path.join(root, "skills");
    const outside = path.join(root, "outside");
    mkdirSync(skills);
    mkdirSync(outside);
    symlinkSync(outside, path.join(skills, "escaped-skill"));
    expect(() => resolveInstalledSkill(skills, "../outside")).toThrow("invalid Foundry skill name");
    expect(() => resolveInstalledSkill(skills, "escaped-skill")).toThrow(
      "outside installed skill root",
    );
  });
});

describe("resolveDeclaredInput", () => {
  test("accepts existing relative inputs and rejects escapes", () => {
    const root = fixtureRoot();
    const run = path.join(root, "run");
    const outside = path.join(root, "outside.txt");
    mkdirSync(run);
    writeFileSync(path.join(run, "input.txt"), "input\n");
    writeFileSync(outside, "outside\n");
    expect(resolveDeclaredInput(run, "input.txt")).toBe(realpathSync(path.join(run, "input.txt")));
    expect(() => resolveDeclaredInput(run, "../outside.txt")).toThrow("escapes");
    expect(() => resolveDeclaredInput(run, outside)).toThrow("must be relative");
  });
});

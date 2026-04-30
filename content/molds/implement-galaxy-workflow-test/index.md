---
type: mold
name: implement-galaxy-workflow-test
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[planemo-asserts-idioms]]"
  - "[[tests-format]]"
summary: "Assemble Galaxy workflow test fixtures and assertions."
---
# implement-galaxy-workflow-test

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

## Tooling to wire in (do not lose)

- **Test-format JSON Schema** — `@galaxy-tool-util/schema` exports `tests.schema.json` (auto-generated from `galaxy.tool_util_models.Tests`). Cast skill should ship the schema verbatim under `references/schemas/tests-format.schema.json` and validate every authored `-tests.yml` against it before any planemo invocation. See `docs/COMPILATION_PIPELINE.md` § *Schema artifacts in casts*.
- **`validateTestsFile(yaml)`** — pure-JS schema validator from the same package. First gate in the inner authoring loop.
- **`checkTestsAgainstWorkflow(workflow, tests)`** — pure-JS cross-checker that reports missing input/output labels and type mismatches between a `.ga` (or format2) workflow and its tests file. Catches the most common authoring failure (renamed output → broken test) without a full planemo run. Second gate in the inner loop. See [[planemo-asserts-idioms]] §6.
- **`planemo workflow_test_init --from_invocation <id>`** — preferred bootstrap for new test files; reviewer convention. See [[planemo-asserts-idioms]] §7.
- **`planemo workflow_test_on_invocation <tests.yml> <id>`** — fast assertion-iteration loop without re-running the workflow.

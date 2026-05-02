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
references:
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Assemble job input fixtures, remote URLs, hashes, collection shapes, and test-data layout in IWC style."
    trigger: "When writing or revising the job/input side of a Galaxy workflow test file."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Choose assertion families, tolerance magnitudes, and the static/Planemo validation loop."
    trigger: "When writing or revising output assertions for a Galaxy workflow test file."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Flag assertion shortcuts that are acceptable in IWC versus shortcuts that should be avoided."
    trigger: "When considering existence-only, size-only, image-only, checksum, output-label, or negative-test patterns."
---
# implement-galaxy-workflow-test

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

## Tooling to wire in (do not lose)

- **Test-format JSON Schema** — `@galaxy-tool-util/schema` exports `tests.schema.json` (auto-generated from `galaxy.tool_util_models.Tests`). Cast skill should ship the schema verbatim under `references/schemas/tests-format.schema.json` and validate every authored `-tests.yml` against it before any planemo invocation. See `docs/COMPILATION_PIPELINE.md` § *Schema artifacts in casts*.
- **`validateTestsFile(yaml)`** — pure-JS schema validator from the same package. First gate in the inner authoring loop.
- **`checkTestsAgainstWorkflow(workflow, tests)`** — pure-JS cross-checker that reports missing input/output labels and type mismatches between a `.ga` (or format2) workflow and its tests file. Catches the most common authoring failure (renamed output → broken test) without a full planemo run. Second gate in the inner loop. See [[planemo-asserts-idioms]] §6.
- **`planemo workflow_test_init --from_invocation <id>`** — preferred bootstrap for new test files; reviewer convention. See [[planemo-asserts-idioms]] §7.
- **`planemo workflow_test_on_invocation <tests.yml> <id>`** — fast assertion-iteration loop without re-running the workflow.

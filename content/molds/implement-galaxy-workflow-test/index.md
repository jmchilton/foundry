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
revised: 2026-05-03
revision: 4
ai_generated: true
related_notes:
  - "[[galaxy-workflow-testability-design]]"
  - "[[iwc-test-data-conventions]]"
  - "[[iwc-shortcuts-anti-patterns]]"
  - "[[planemo-asserts-idioms]]"
  - "[[tests-format]]"
cli_commands:
  - "[[validate-tests]]"
summary: "Assemble Galaxy workflow test fixtures and assertions."
references:
  - kind: cli-command
    ref: "[[validate-tests]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: corpus-observed
    purpose: "Run the cheap static workflow-test validation and workflow-label cross-check before Planemo execution."
    trigger: "After authoring or editing a Galaxy workflow test file and before Planemo invocation."
  - kind: schema
    ref: "[[tests-format]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "JSON Schema contract for the Galaxy workflow test format. Output of this Mold must validate against it."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Revise workflow inputs, outputs, labels, checkpoints, and collection identifiers so meaningful tests can be authored."
    trigger: "When test authoring reveals missing labels, omitted workflow-level outputs, unstable collection identifiers, weakly assertable final outputs, or fixture-shape pressure on workflow inputs."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Assemble job input fixtures, remote URLs, hashes, collection shapes, and test-data layout in IWC style."
    trigger: "When writing or revising the job/input side of a Galaxy workflow test file."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose assertion families, tolerance magnitudes, and the static/Planemo validation loop."
    trigger: "When writing or revising output assertions for a Galaxy workflow test file."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Flag assertion shortcuts that are acceptable in IWC versus shortcuts that should be avoided."
    trigger: "When considering existence-only, size-only, image-only, checksum, output-label, or negative-test patterns."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Write tests with stable labels and artifacts that Planemo can connect back to Galaxy invocations, jobs, and outputs."
    trigger: "When adding or revising workflow tests that will be iterated with Planemo or generated from existing invocations."
---
# implement-galaxy-workflow-test

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

## Tooling to wire in (do not lose)

- **Test-format JSON Schema** — `@galaxy-tool-util/schema` exports `tests.schema.json` (auto-generated from `galaxy.tool_util_models.Tests`). Cast skill should ship the schema verbatim under `references/schemas/tests-format.schema.json` and validate every authored `-tests.yml` against it before any planemo invocation. See `docs/COMPILATION_PIPELINE.md` § *Schema artifacts in casts*.
- **`validateTestsFile(yaml)`** — pure-JS schema validator from the same package. First gate in the inner authoring loop.
- **`checkTestsAgainstWorkflow(workflow, tests)`** — pure-JS cross-checker that reports missing input/output labels and type mismatches between a `.ga` (or format2) workflow and its tests file. Catches the most common authoring failure (renamed output → broken test) without a full planemo run. Second gate in the inner loop. See [[planemo-asserts-idioms]] §6.
- **`gxwf validate-tests <tests.yml> --workflow <workflow> --json`** — CLI form of the same static gates for cast skills that operate through subprocesses. See [[validate-tests]].
- **`planemo workflow_test_init --from_invocation <id>`** — preferred bootstrap for new test files; reviewer convention. See [[planemo-asserts-idioms]] §7.
- **`planemo workflow_test_on_invocation <tests.yml> <id>`** — fast assertion-iteration loop without re-running the workflow.

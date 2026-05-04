---
type: cli-command
tool: gxwf
command: validate-tests
tags:
  - cli-command
  - cli/gxwf
status: draft
created: 2026-05-03
revised: 2026-05-04
revision: 2
ai_generated: true
summary: "Validate Galaxy workflow test files and optionally cross-check labels against their workflow."
related_notes:
  - "[[tests-format]]"
  - "[[planemo-asserts-idioms]]"
---

# `gxwf validate-tests`

Validate a Galaxy workflow test file (`*-tests.yml` or `*.gxwf-tests.yml`) against the Galaxy tests schema. Optionally cross-check the test file against a workflow so missing input labels, missing output labels, and type mismatches fail before a slow Planemo run.

## Install

Use the Foundry-supported `gxwf` CLI from `@galaxy-tool-util/cli` or the Python package with the matching interface. Inside this repo, `validate-tests-format` from `@galaxy-foundry/tests-format-schema` exposes the same schema gate plus workflow cross-check for harness and package tests.

## Synopsis

```bash
gxwf validate-tests <file> [options]
```

`<file>` is a workflow test YAML file, usually named `<workflow>-tests.yml` or `<workflow>.gxwf-tests.yml`.

## Options

| Option | Description |
|---|---|
| `--json` | Emit a structured JSON validation report. Preferred for cast skills and harness routing. |
| `--workflow <path>` | Cross-check job inputs and output assertions against a Galaxy workflow (`.ga` or `.gxwf.yml`). |

## Output

Default output is human-readable validation diagnostics.

With `--json`, the command emits a structured report describing schema errors and, when `--workflow` is supplied, workflow-coherence errors such as missing labels or incompatible input values.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Test file is schema-valid and any requested workflow cross-check passed. |
| non-zero | The test file is invalid, the workflow cross-check failed, or an input file could not be loaded. |

## Examples

```bash
gxwf validate-tests workflow-tests.yml
gxwf validate-tests workflow-tests.yml --json
gxwf validate-tests workflow-tests.yml --workflow workflow.gxwf.yml --json
```

## Gotchas

- This is the cheap static gate before Planemo. It does not execute the workflow and does not prove assertions pass on real outputs.
- Use `--workflow` whenever the workflow file is available. Schema-valid tests can still reference stale input/output labels after workflow edits.
- Run this before `planemo workflow_test_on_invocation` or full `planemo test`; it catches authoring mistakes without starting Galaxy.
- The assertion vocabulary itself comes from `[[tests-format]]`; strategy for choosing assertions lives in `[[planemo-asserts-idioms]]`.

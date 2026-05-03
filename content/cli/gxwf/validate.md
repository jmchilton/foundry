---
type: cli-command
tool: gxwf
command: validate
tags:
  - cli-command
  - cli/gxwf
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 2
ai_generated: true
summary: "Validate Galaxy workflow structure, tool state, and optional connection compatibility before runtime execution."
---

# `gxwf validate`

Validate a Galaxy workflow source file before attempting runtime execution. Use this as the design-time guardrail after step implementation and again after final workflow assembly.

## Install

Use the Foundry-supported `gxwf` CLI from `@galaxy-tool-util/cli` or the Python package with the matching interface. Prefer the project-local executable when running inside a checked-out Foundry or galaxy-tool-util workspace.

## Synopsis

```bash
gxwf validate <file> [options]
```

## Options

| Option | Description |
|---|---|
| `--format <fmt>` | Force source format: `native` or `format2`; otherwise auto-detected from file extension/content. |
| `--json` | Emit a structured JSON validation report. Preferred for cast skills and harness routing. |
| `--report-html [file]` | Write an HTML validation report to `file`, or stdout when the optional file value is omitted. |
| `--no-tool-state` | Skip tool-state validation. Use only when tool metadata is unavailable and structural checks are still useful. |
| `--cache-dir <dir>` | Tool cache directory used for tool-state validation. |
| `--mode <mode>` | Validation backend. Upstream default is `effect`; `json-schema` is available for schema-backed/offline cases. |
| `--tool-schema-dir <dir>` | Directory of pre-exported per-tool JSON Schemas for offline `json-schema` mode. |
| `--connections` | Validate connection-type compatibility, including collection algebra and map-over/reduction compatibility. |
| `--strict` | Shorthand for `--strict-structure --strict-encoding --strict-state`. |
| `--strict-structure` | Reject unknown envelope/step keys. |
| `--strict-encoding` | Reject legacy JSON-string `tool_state` and format2 field misuse. |
| `--strict-state` | Require every tool step to validate; no skipped tool-state checks. |

## Output

Default output is human-readable diagnostics. JSON output should be treated as the preferred cast-skill interface; free-text diagnostics are a fallback for humans.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Workflow validation passed. |
| non-zero | Validation failed, the workflow could not be loaded, or a selected validation backend could not complete. |

## Examples

```bash
gxwf validate workflow.ga
gxwf validate workflow.gxwf.yml --json
gxwf validate workflow.gxwf.yml --json --connections --strict
gxwf validate workflow.ga --mode json-schema --tool-schema-dir ./tool-schemas --json
```

## Gotchas

- Validation is design-time structure checking. It does not prove that a workflow test will pass under Planemo.
- Run after each generated Galaxy step when the harness can still attribute failures to the fresh step.
- Run again after assembly to catch cross-step or workflow-level issues before runtime testing.
- Prefer `--json` whenever a cast skill or harness needs to classify diagnostics.
- Use `--connections` when tool cache metadata is available and data-shape compatibility matters, especially around collections and map-over.
- `--no-tool-state` weakens validation. If used, record why tool metadata was unavailable and rerun without it before final runtime testing.

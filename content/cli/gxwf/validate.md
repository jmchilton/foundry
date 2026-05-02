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
revision: 1
ai_generated: true
summary: "Validate gxformat2 Galaxy workflow structure and emit diagnostics before runtime execution."
---

# `gxwf validate`

Validate a Galaxy workflow source file before attempting runtime execution. Use this as the design-time guardrail after step implementation and again after final workflow assembly.

## Install

Use the Foundry-supported `gxwf` CLI from `@galaxy-tool-util/cli` or the Python package with the matching interface. Prefer the project-local executable when running inside a checked-out Foundry or galaxy-tool-util workspace.

## Synopsis

```bash
gxwf validate <workflow> [options]
```

## Options

| Option | Description |
|---|---|
| `--json` | Emit machine-readable diagnostics when available. |
| `--format <format>` | Select workflow format when the CLI cannot infer it from the file extension. |

## Output

Default output is human-readable diagnostics. JSON output should be treated as the preferred cast-skill interface when available; free-text diagnostics are a fallback.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Workflow validation passed. |
| non-zero | Validation failed or the workflow could not be loaded. |

## Examples

```bash
gxwf validate workflow.ga
gxwf validate workflow.gxwf.yml --json
```

## Gotchas

- Validation is design-time structure checking. It does not prove that a workflow test will pass under Planemo.
- Run after each generated Galaxy step when the harness can still attribute failures to the fresh step.
- Run again after assembly to catch cross-step or workflow-level issues before runtime testing.

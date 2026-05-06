---
type: cli-command
tool: gxwf
command: convert
tags:
  - cli-command
  - cli/gxwf
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Convert a Galaxy workflow between native (.ga) and format2 (.gxwf.yml) representations."
---

# `gxwf convert`

Convert a Galaxy workflow between the native `.ga` JSON and the `.gxwf.yml` format2 representation. Use this to normalize fetched IWC workflows into a consistent comparison representation.

## Install

Use the Foundry-supported `gxwf` CLI from `@galaxy-tool-util/cli`.

## Synopsis

```bash
gxwf convert <file> [options]
```

## Options

| Option | Description |
|---|---|
| `--to <format>` | Target format: `native` or `format2`; default infers the opposite of the source. |
| `--output <file>` | Write result to file (default: stdout). |
| `--compact` | Omit position info in format2 output. |
| `--json` | Force JSON output. |
| `--yaml` | Force YAML output. |
| `--format <fmt>` | Force source format (auto-detected by default). |
| `--stateful` | Use cached tool definitions for schema-aware tool-state re-encoding. |
| `--cache-dir <dir>` | Tool cache directory (used with `--stateful`). |
| `--strict` | Shorthand for `--strict-structure --strict-encoding --strict-state`. |
| `--strict-structure` | Reject unknown envelope/step keys. |
| `--strict-encoding` | Reject legacy JSON-string `tool_state` and format2 field misuse. |
| `--strict-state` | Require every tool step to validate; no skipped tool-state checks. |

## Output

Default output is the converted workflow on stdout. With `--output`, the result is written to a file. JSON output is selected with `--json` (or `--to native`); YAML output is selected with `--yaml` (or `--to format2`).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Conversion succeeded. |
| non-zero | Source could not be loaded, target format could not be produced, or strict checks failed. |

## Examples

```bash
gxwf convert workflow.ga --to format2 --output workflow.gxwf.yml
gxwf convert workflow.ga --to format2 --compact
gxwf convert workflow.gxwf.yml --to native --output workflow.ga
```

## Gotchas

- Default output is stdout; pipe or pass `--output` when persisting.
- `--compact` drops node position metadata; useful for structural diffs and skeleton generation.
- `--stateful` requires a populated tool cache (see `galaxy-tool-cache`); without it, tool-state stays as fetched.

# @galaxy-foundry/summarize-nextflow

Statically introspect a Nextflow / nf-core pipeline tree and emit a JSON summary.

Source-specific (Nextflow), target-agnostic. The summary is the input to downstream Galaxy / CWL translation tooling. Output validates against the schema vendored under `content/schemas/summary-nextflow.schema.json` in the parent Foundry repo.

## Status

`v0.0.0` — scaffolded. CLI surface is wired; resolution logic is not yet implemented. See `content/molds/summarize-nextflow/` and `content/research/external-tool-{nf-core-tools,nextflow-inspect}.md` for design context.

## Install

```sh
npx @galaxy-foundry/summarize-nextflow <pipeline-path-or-url> [options]
```

## Usage

```sh
summarize-nextflow <path-or-url> \
  [--profile=test] \
  [--pin=<sha-or-tag>] \
  [--out=summary.json] \
  [--no-with-nextflow] \
  [--fetch-test-data] \
  [--no-validate]
```

### Optional Nextflow integration

When `nextflow` is on PATH, `summarize-nextflow` shells out to `nextflow inspect -format json` and `nextflow config -flat` for fields only Groovy can resolve (per-process container under a profile, fully merged config). Pass `--no-with-nextflow` to force pure static parsing. See `content/research/external-tool-nextflow-inspect.md`.

## Output contract

JSON to stdout (or `--out=`). Stderr is human-readable progress. Exit codes:

- `0` — success
- `1` — input error (missing path, bad URL)
- `2` — resolution failure (network, missing dependency)
- `3` — schema validation failure
- `64` — not yet implemented

## License

MIT.

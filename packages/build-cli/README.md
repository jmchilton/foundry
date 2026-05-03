# @galaxy-foundry/build-cli

Build and authoring CLI for Galaxy Workflow Foundry source trees.

## Status

`v0.0.0` — initial package boundary for validation, deterministic casting, and generated content checks.

## Install

```sh
pnpm add -D @galaxy-foundry/build-cli
```

## Usage

```sh
foundry-build validate --root .
foundry-build cast summarize-nextflow --root . --target=claude --check
foundry-build generate-index --root . --check
foundry-build generate-dashboard --root . --check
```

## Commands

- `validate` — validate Foundry content frontmatter, cross-file links, Mold references, pipeline phases, Mold source layout, CLI command docs, and pattern evidence metadata.
- `cast` — deterministically assemble a Mold cast bundle and provenance for a target.
- `generate-index` — write or check `content/Index.md`.
- `generate-dashboard` — write or check `content/Dashboard.md` from `dashboard_sections.json`.

## License

MIT.

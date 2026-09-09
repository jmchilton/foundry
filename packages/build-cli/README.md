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
foundry-build test-pipeline nextflow-to-galaxy --root . \
  --scenario "nf-core/demo end to end" --through 2 \
  --engine pi --sandbox container \
  --provider anthropic --model MODEL_ID --credential-env ANTHROPIC_API_KEY
```

## Commands

- `validate` — validate Foundry content frontmatter, cross-file links, Mold references, pipeline phases, Mold source layout, CLI command docs, and pattern evidence metadata.
- `cast` — deterministically assemble a Mold cast bundle and provenance for a target.
- `generate-index` — write or check `content/Index.md`.
- `generate-dashboard` — write or check `content/Dashboard.md` from `dashboard_sections.json`.
- `test-skill` — run one cast skill in a fresh Pi worker and retain its trace and validated artifacts.
- `test-pipeline` — run a linear prefix of an assembled Pipeline with one fresh Pi worker per phase. It resolves a named Pipeline scenario, carries forward only artifact IDs declared by the next skill, supports `--through <phase-or-skill>` and `--trials N`, and writes an aggregate `run.json` beside each phase's worker record and raw trace. Branches and loops are rejected during preflight until their controller-owned predicates are implemented.

## License

MIT.

# Working in the Galaxy Workflow Foundry

## Read first

**Read `content/glossary.md` immediately at session start.** The Foundry uses domain-specific terminology — Mold, Pipeline, Phase, Branch, Cast, Pattern, CLI Mold, Foundry, axis, … — that isn't standard Galaxy or workflow vocabulary. The glossary is small, alphabetical, and worth loading in full before reasoning about anything else here. Misreading a Mold note without knowing what "Mold" means leads nowhere good.

## Then orient

- `README.md` — what this project is and why.
- `docs/ARCHITECTURE.md` — directory layout, types, validation pipeline, site rendering. The structural authority.
- `docs/MOLDS.md` — Mold inventory and bucketing axes.
- `docs/HARNESS_PIPELINES.md` — pipeline narrative behind `content/pipelines/`.
- `docs/COMPILATION_PIPELINE.md` — casting design.
- `docs/CORPUS_INGESTION.md` — IWC grounding; URL-not-mirror principle.

## Authoring rules

- **Frontmatter is contract.** `meta_schema.yml` is JSON Schema Draft 07 with `additionalProperties: false`. Unknown fields are rejected. Add a property declaration in the schema before adding a frontmatter field anywhere.
- **Tags must be registered.** Every tag a note uses lives in `meta_tags.yml`. Vocabulary changes touch one file.
- **Wiki-link fields use `[[Target]]`.** Single-value fields (`parent_pattern`) and array fields (`related_notes`, `related_patterns`, `related_molds`, `patterns`, `cli_commands`, `prompts`).
- **Validate before commit.** `npm run validate` checks schema + cross-file resolution. Errors block; warnings are advisory.
- **Don't edit generated files by hand.** `Dashboard.md`, `Index.md`, `iwc-overview.md` are produced by `scripts/generate-*.ts`. `glossary.md` is hand-curated and skipped by the validator. `log.md` is append-only.

## Don't

- **Don't weaken the schema to accept a non-conforming note.** Reshape the note or extend the schema deliberately (with tests).
- **Don't add ad-hoc frontmatter fields.** `additionalProperties: false` rejects them.
- **Don't write multi-paragraph comments in code.** One short line max, only when intent isn't obvious from the code.
- **Don't use Obsidian Templater.** Foundry doesn't carry it; slash commands handle scaffolding.

## Run

```sh
npm run validate           # schema + cross-file checks
npm run test               # vitest (root: validator + content tests)
npm run typecheck          # tsc --noEmit (foundry-internal scripts/)
npm run packages-test      # vitest across packages/* via pnpm -r
npm run packages-typecheck # tsc --noEmit across packages/* via pnpm -r
npm run packages-build     # tsc emit across packages/*
```

## Package layout

Publishable CLIs live under `packages/<name>/` as a pnpm workspace; mirrors `galaxy-tool-util-ts`'s structure. First package: `@galaxy-foundry/summarize-nextflow`. Foundry-internal scripts stay under `scripts/` (not workspace packages — they support content authoring, not external consumers). pnpm 10.x is the package manager (`packageManager` field is contractual). The npm wrappers above invoke `pnpm -r` under the hood.

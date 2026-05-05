# Schema Packages

Foundry-authored Mold IO schemas live in their TypeScript package under `packages/<name>-schema/src/`. The Foundry's `content/schemas/` only holds the human-readable `<name>.md` schema notes; there is no JSON mirror there. Mold frontmatter still cites schemas as `content/schemas/<base>.schema.json` for stability — cast and Astro resolve that ref back to the package source at build time (see `packages/build-cli/src/lib/schema-paths.ts`).

A schema gets a TypeScript package when cast skills or downstream tools need a stable validator command.

## Source Chain

1. Author the canonical JSON Schema at `packages/<name>-schema/src/<name>.schema.json`.
2. Add the renderable schema note at `content/schemas/<name>.md` with `type: schema`, `package`, and `upstream`.
3. Regenerate `src/<name>.schema.generated.ts` from the canonical JSON via `scripts/sync-schema.mjs`.
4. Export the generated schema const and a library validator from `src/index.ts`.
5. Ship a CLI validator from `src/bin/validate-<name>.ts`.
6. Register the schema in `site/src/lib/schema-registry.ts` importing the package's `src/<name>.schema.json` plus its `package.json` for the version.
7. Add the basename → package-source mapping in `packages/build-cli/src/lib/schema-paths.ts` so `content/schemas/<base>.schema.json` refs resolve.

## Package Shape

Each schema package should provide:

- `src/<name>.schema.json` — canonical JSON Schema (hand-edited).
- `src/<name>.schema.generated.ts` regenerated from the canonical JSON.
- `src/validate.ts` with an AJV-backed `validate<Name>()` function.
- `src/bin/validate-<name>.ts` with exit codes `0` valid, `3` schema-validation failure, `1` input or JSON error.
- `test/validate.test.ts` plus `vitest.config.ts` with `include: ["test/**/*.test.ts"]`.
- `scripts/sync-schema.mjs` and `scripts/copy-schema-assets.mjs`.
- `README.md` documenting the content source, library usage, and CLI usage.

Generated skills should validate through the CLI command, not by importing library functions. Library validators exist for TypeScript consumers and package tests; CLI validation keeps agent logs and failure reproduction explicit.

Current packages:

- `@galaxy-foundry/summary-nextflow-schema` -> `validate-summary-nextflow`
- `@galaxy-foundry/galaxy-tool-discovery-schema` -> `validate-galaxy-tool-discovery`

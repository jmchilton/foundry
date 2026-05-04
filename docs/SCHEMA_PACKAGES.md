# Schema Packages

Foundry-authored Mold IO schemas live first in `content/schemas/`. A schema gets a TypeScript package when cast skills or downstream tools need a stable validator command.

## Source Chain

1. Author the canonical JSON Schema at `content/schemas/<name>.schema.json`.
2. Add the renderable schema note at `content/schemas/<name>.md` with `type: schema`, `package`, and `upstream`.
3. Mirror the schema into `packages/<name>-schema/src/` with `scripts/sync-schema.mjs`.
4. Export the generated schema const and a library validator from `src/index.ts`.
5. Ship a CLI validator from `src/bin/validate-<name>.ts`.
6. Register the schema in `site/src/lib/schema-registry.ts` using the content JSON plus package version.

## Package Shape

Each schema package should provide:

- `src/<name>.schema.generated.ts` generated from the content schema.
- `src/<name>.schema.json` copied from the content schema for package export.
- `src/validate.ts` with an AJV-backed `validate<Name>()` function.
- `src/bin/validate-<name>.ts` with exit codes `0` valid, `3` schema-validation failure, `1` input or JSON error.
- `test/validate.test.ts` plus `vitest.config.ts` with `include: ["test/**/*.test.ts"]`.
- `scripts/sync-schema.mjs` and `scripts/copy-schema-assets.mjs`.
- `README.md` documenting the content source, library usage, and CLI usage.

Generated skills should validate through the CLI command, not by importing library functions. Library validators exist for TypeScript consumers and package tests; CLI validation keeps agent logs and failure reproduction explicit.

Current packages:

- `@galaxy-foundry/summary-nextflow-schema` -> `validate-summary-nextflow`
- `@galaxy-foundry/galaxy-tool-discovery-schema` -> `validate-galaxy-tool-discovery`

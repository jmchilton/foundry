# @galaxy-foundry/galaxy-tool-summary-schema

JSON Schema for the [Foundry's](https://github.com/jmchilton/foundry) Galaxy tool summary manifest — the deterministic per-tool JSON emitted by `galaxy-tool-cache summarize` from [`@galaxy-tool-util/cli`](https://www.npmjs.com/package/@galaxy-tool-util/cli) — plus an AJV-backed validator and a `validate-galaxy-tool-summary` CLI.

## Source of truth

The schema is authored in this package at `src/galaxy-tool-summary.schema.json` (canonical, hand-edited). `scripts/sync-schema.mjs` regenerates the typed const wrapper at `src/galaxy-tool-summary.schema.generated.ts` from it; this runs as `prebuild`. The Foundry's `content/schemas/` only holds the rendered `<name>.md` schema note — Mold frontmatter cites `content/schemas/galaxy-tool-summary.schema.json` as a stable ref string and the cast pipeline resolves it back to this package at build time.

The `parsed_tool` subtree is described upstream in [`@galaxy-tool-util/schema`](https://www.npmjs.com/package/@galaxy-tool-util/schema) as `parsedToolSchema`. To keep the canonical JSON file self-contained for site rendering, this package's schema declares a placeholder `$defs.ParsedTool` and the validator injects the runtime upstream export at AJV-construction time so `parsed_tool` is validated against the live upstream contract.

## Install

```sh
npm install @galaxy-foundry/galaxy-tool-summary-schema
```

## Usage

```ts
import {
  galaxyToolSummarySchema,
  validateGalaxyToolSummary,
} from "@galaxy-foundry/galaxy-tool-summary-schema";

const result = validateGalaxyToolSummary(myJson);
if (!result.valid) {
  for (const err of result.errors) {
    console.error(err.path, err.message);
  }
}
```

## CLI

```sh
npx @galaxy-foundry/galaxy-tool-summary-schema validate-galaxy-tool-summary manifest.json
```

End-to-end against a real cached tool:

```sh
galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/devteam/fastqc/fastqc --version 0.74+galaxy0
galaxy-tool-cache summarize fastqc --version 0.74+galaxy0 > fastqc.summary.json
npx @galaxy-foundry/galaxy-tool-summary-schema validate-galaxy-tool-summary fastqc.summary.json
```

Exit codes: `0` valid, `3` schema-validation failure, `1` input error.

Cast skills should invoke the CLI before returning a manifest. Library validation exists for package consumers, but generated-skill validation should be command-shaped so logs and failure modes are explicit.

## License

MIT.

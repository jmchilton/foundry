# @galaxy-foundry/summary-nextflow-schema

JSON Schema for the [Foundry's](https://github.com/jmchilton/foundry) `summarize-nextflow` output format, plus an AJV-backed validator and a `validate-summary-nextflow` CLI.

## Source of truth

The schema is authored in the Foundry monorepo at `content/schemas/summary-nextflow.schema.json`. This package mirrors it via `scripts/sync-schema.mjs`, which runs as `prebuild`. The mirror lives at `src/summary-nextflow.schema.json`; a TypeScript const wrapper is generated at `src/summary-nextflow.schema.generated.ts`. Both are committed to make publish reproducible without the monorepo present.

## Install

```sh
npm install @galaxy-foundry/summary-nextflow-schema
```

## Usage

```ts
import { validateSummary, summaryNextflowSchema } from "@galaxy-foundry/summary-nextflow-schema";

const result = validateSummary(myJson);
if (!result.valid) {
  for (const err of result.errors) {
    console.error(err.path, err.message);
  }
}
```

## CLI

```sh
npx @galaxy-foundry/summary-nextflow-schema validate-summary-nextflow path/to/summary.json
```

Exit codes: `0` valid, `3` schema-validation failure, `1` input error.

Cast skills should invoke the CLI before returning a summary. Library validation exists for TypeScript consumers, but generated-skill validation should be command-shaped so logs and failure modes are explicit.

## License

MIT.

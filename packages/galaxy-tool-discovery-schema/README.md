# @galaxy-foundry/galaxy-tool-discovery-schema

JSON Schema for the [Foundry's](https://github.com/jmchilton/foundry) `discover-shed-tool` recommendation format, plus an AJV-backed validator and a `validate-galaxy-tool-discovery` CLI.

## Source Of Truth

The schema is authored in the Foundry monorepo at `content/schemas/galaxy-tool-discovery.schema.json`. This package mirrors it via `scripts/sync-schema.mjs`, which runs as `prebuild`. The mirror lives at `src/galaxy-tool-discovery.schema.json`; a TypeScript const wrapper is generated at `src/galaxy-tool-discovery.schema.generated.ts`. Both are committed to make publish reproducible without the monorepo present.

## Install

```sh
npm install @galaxy-foundry/galaxy-tool-discovery-schema
```

## Usage

```ts
import {
  galaxyToolDiscoverySchema,
  validateGalaxyToolDiscovery,
} from "@galaxy-foundry/galaxy-tool-discovery-schema";

const result = validateGalaxyToolDiscovery(myJson);
if (!result.valid) {
  for (const err of result.errors) {
    console.error(err.path, err.message);
  }
}
```

## CLI

```sh
npx @galaxy-foundry/galaxy-tool-discovery-schema validate-galaxy-tool-discovery recommendation.json
```

Exit codes: `0` valid, `3` schema-validation failure, `1` input error.

Cast skills should invoke the CLI before returning a recommendation. Library validation exists for package consumers, but generated-skill validation should be command-shaped so logs and failure modes are explicit.

## License

MIT.

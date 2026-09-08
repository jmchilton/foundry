# Minimal Nextflow Pipeline

A small committed input for the first Pi-backed `summarize-nextflow` conformance run in issue #476.

Run it from the repository root after configuring a Pi-supported provider credential:

```sh
npm run test-skill -- summarize-nextflow \
  --input verification/pipelines/minimal-nextflow \
  --prompt "Summarize inputs/minimal-nextflow and write summary-nextflow.json in the worker root." \
  --provider anthropic \
  --model <model-id> \
  --thinking medium
```

The deterministic post-run check reads the cast's `_verify.json` and validates `summary-nextflow.json` independently of the worker.

For the clean-room path, build the pinned worker image and explicitly forward only the provider key:

```sh
npm run gxwf-pi-harness:container-build
npm run test-skill -- summarize-nextflow \
  --input verification/pipelines/minimal-nextflow \
  --prompt "Summarize /inputs/minimal-nextflow and write summary-nextflow.json in /workspace." \
  --provider anthropic \
  --model <model-id> \
  --thinking medium \
  --sandbox container \
  --sandbox-network bridge \
  --credential-env ANTHROPIC_API_KEY
```

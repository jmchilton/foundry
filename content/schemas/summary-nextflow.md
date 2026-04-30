---
type: schema
name: summary-nextflow
title: Nextflow pipeline summary
tags:
  - schema
  - source/nextflow
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
related_notes:
  - "[[summarize-nextflow]]"
  - "[[summary-to-galaxy-data-flow]]"
  - "[[summary-to-cwl-data-flow]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[nextflow-test-to-target-tests]]"
summary: "JSON Schema for the structured summary emitted by the summarize-nextflow Mold."
---

This schema is **Foundry-authored** — there is no upstream package. The JSON lives at `content/schemas/summary-nextflow.schema.json` next to this note and is registered in `site/src/lib/schema-registry.ts` for rendering.

Contrast with [[tests-format]], which is vendored from the `@galaxy-tool-util/schema` npm package: that one has an upstream source of truth; this one's source of truth is in this repo.

## Why per-source

Paper, Nextflow, and CWL are different enough that forcing a shared cross-source summary shape would either lose detail or bloat all three (`docs/HARNESS_PIPELINES.md` §"Mold-inventory parity"). Each `summarize-<source>` Mold emits its own schema; downstream Molds (`summary-to-galaxy-data-flow`, `summary-to-cwl-data-flow`) consume any source's summary, with the cast skill handling the polymorphism.

## Field-name parity with gxy-sketches

Three sub-shapes mirror gxy-sketches verbatim — see `docs/GXY_SKETCHES_ALIGNMENT.md` for the rationale:

- `SourceRecord` — mirrors `SketchSource` (`ecosystem`, `workflow`, `url`, `version`, `license`, `slug`).
- `Tool` — extends `ToolSpec` (`name`, `version`) with the resolved container/conda strings the bridge to [[author-galaxy-tool-wrapper]] needs.
- `TestDataRef` / `ExpectedOutputRef` — mirror gxy-sketches' field names exactly. The sketch-bundle invariant that `path` must live under `test_data/` is intentionally dropped; the Foundry summary describes fixtures as data, it does not bundle them.

## Cast-time role

Per `docs/COMPILATION_PIPELINE.md`'s per-kind dispatch, this schema is referenced by `[[summarize-nextflow]]` via `output_schemas` and copied verbatim into the cast bundle's `references/schemas/`. The cast skill validates its emitted JSON against it before returning; failure is loud — downstream Molds bind to this shape and would produce worse errors later.

## What is intentionally not modeled

- **Structured channel typing.** `processes[].inputs[].shape` is a string (`"tuple(meta, [path,path])"`), not a structured type. NF channel typing is a research project; a string is enough for downstream Molds to reason about and an LLM to emit.
- **Operator-chain semantics.** `Edge.via` records the literal operator chain (`["map", "join", "groupTuple"]`). Reconciling what the chain *does* to channel shapes is left to the LLM step that fills `Edge.notes` when confidence is low.
- **Multi-tool processes.** A process can run multiple tools (a shell pipeline of two binaries). `Process.tool` is nullable; multi-tool processes set it null and surface tool details in `script_summary` and `container`. A `tools[]` foreign-key array on `Process` would be cleaner; deferred until the second NF pipeline forces it.

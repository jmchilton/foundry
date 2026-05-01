---
type: schema
name: summary-nextflow
title: Nextflow pipeline summary
package: "@galaxy-foundry/summary-nextflow-schema"
upstream: "https://github.com/jmchilton/foundry/blob/main/packages/summary-nextflow-schema/src/summary-nextflow.schema.json"
tags:
  - schema
  - source/nextflow
status: draft
created: 2026-04-30
revised: 2026-05-01
revision: 3
ai_generated: true
related_notes:
  - "[[summarize-nextflow]]"
  - "[[summary-to-galaxy-data-flow]]"
  - "[[summary-to-cwl-data-flow]]"
  - "[[author-galaxy-tool-wrapper]]"
  - "[[nextflow-test-to-target-tests]]"
summary: "JSON Schema for the structured summary emitted by the summarize-nextflow Mold."
---

This page is auto-rendered from the JSON Schema authored in this repo and shipped on npm as `@galaxy-foundry/summary-nextflow-schema`. Each `$def` becomes a section below with a stable anchor ID — research notes and Mold bodies can deep-link individual shapes via `[[summary-nextflow#Tool]]`.

**Source-of-truth chain:**

1. `content/schemas/summary-nextflow.schema.json` in this repo — the canonical JSON. Edited as part of the mold/cast loop ([[summarize-nextflow]]).
2. `packages/summary-nextflow-schema/scripts/sync-schema.mjs` runs at `prebuild`, copying the JSON into `src/` and emitting a typed `summary-nextflow.schema.generated.ts` const wrapper.
3. Published as `@galaxy-foundry/summary-nextflow-schema` on npm. Site rendering currently reads directly from `content/schemas/`; the published artifact also exports `validateSummary()` and ships a `validate-summary-nextflow` CLI bin for downstream consumers.

**At runtime in cast skills:** the same schema is copied verbatim into `references/schemas/summary-nextflow.schema.json` per the casting policy in `docs/COMPILATION_PIPELINE.md`. The package additionally exports `validateSummary` (AJV gate) and the `validate-summary-nextflow` CLI — both pure-JS and used by [[summarize-nextflow]]'s emit-time validation step.

Contrast with [[tests-format]], which is vendored *from* an external npm package (`@galaxy-tool-util/schema`); this schema is *authored here* and shipped *to* npm — the direction of the source-of-truth chain is reversed.

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

## Revision 2 — 2026-05-01

First cast against `nf-core/demo @ 1.1.0` exposed gaps in the v1 shape (see `content/log.md`'s 2026-05-01 entry). Changes:

- **`Tool.biocontainer` description widened** to accept the docker.io alias `biocontainers/<name>:<version>--<build>` alongside `quay.io/biocontainers/...`. Modern nf-core modules publish the docker.io form in the docker branch and the `depot.galaxyproject.org/singularity/...` form in the singularity branch.
- **`Tool.wave` field added** for Seqera Wave / community-cr registry images (`community.wave.seqera.io/...`, `https://community-cr-prod.seqera.io/...`). Kept distinct from `docker` because resolution rules and provenance differ.
- **`Process.container` and `Process.conda` re-described as verbatim directive text** (not "resolved"). Modern container directives are ternary expressions over `workflow.containerEngine`; modern conda directives are file references to `${moduleDir}/environment.yml`. The schema now records the directive faithfully and pushes resolution into `tools[]`.
- **`ChannelIO.topic` field added** for Nextflow 24+ channel topics. nf-core templates emit a per-process `topic: versions` triple to a global topic for version aggregation; the v1 shape had no place to record this.
- **`Subworkflow.kind` enum added** (`pipeline` | `utility`). nf-core template subworkflows like PIPELINE_INITIALISATION compose free-function calls (`paramsHelp`, `completionEmail`) without invoking processes; their `calls[]` is empty by design. The `kind` field disambiguates real data-flow contributors from utility wrappers.
- **`Workflow.name` description names the selection rule** for pipelines with multiple named workflow blocks (anonymous `workflow {}` + NFCORE_<NAME> + a substantive named workflow): pick the one with the most process invocations — typically `workflows/<name>.nf` — and route the rest into `subworkflows[]`.

What was *not* changed despite biting:
- nf-test snapshot assertions (`snapshot(...).match()` with helpers) remain summarized to prose strings in `ExpectedOutputRef.assertions[]`. A structured "snapshot fixture" shape would help but is deferred until rev 3 when the testing note has paragraphs to inform the design.
- Free-function calls in workflow bodies (`paramsSummaryMap`, `softwareVersionsToYAML`) remain folded into channel `description` text. No first-class representation; their effects are channel sources, the names are nf-core idiom not pipeline-specific signal.

## Revision 3 — 2026-05-01

Second cast against `nf-core/bacass @ 2.5.0` (33 processes, 9 nf-test files, 11 test profiles) exposed two structural-coverage gaps the second pipeline made universal. Changes:

- **`Process.aliases: string[]` added.** Real pipelines re-import a single module multiple times under different aliases via `include { X as Y }` — bacass has six such patterns (CAT_FASTQ→{SHORT,LONG}, MINIMAP2_ALIGN→{CONSENSUS,POLISH} (3 aliases of one process), KRAKEN2_KRAKEN2→{KRAKEN2,KRAKEN2_LONG}, QUAST→QUAST_BYREFSEQID, plus FASTQC→{RAW,TRIM} inside FASTQ_TRIM_FASTP_FASTQC). Workflow `edges[].from`/`.to` reference alias names; canonical names didn't appear in edges at all. The new field captures the alias→canonical mapping so downstream skills (especially author-galaxy-tool-wrapper, which needs to know "MINIMAP2_CONSENSUS shares MINIMAP2_ALIGN's container/conda but is invoked with different runtime args") can resolve references.
- **`Summary.nf_tests: NfTest[]` added.** bacass has 9 `tests/*.nf.test` files, one per test profile. The previous schema's `test_fixtures` is singular (one selected profile's data shape); the rest of the test surface was invisible. The new array enumerates every `.nf.test` with structured fields: profile, params overrides, assert_workflow_success, prose_assertions, and a structured `snapshot: SnapshotFixture | null` capturing the `snapshot(...).match()` semantics.
- **`SnapshotFixture` shape added.** nf-core templates use a near-uniform snapshot pattern: pass succeeded-task-count + version-yaml + stable-name list + stable-path list into snapshot(), pruning via `ignoreFile:` and `ignore:` globs. The new shape records `captures`, `helpers`, `ignore_files`, `ignore_globs`, and the `.snap` path — enough for downstream test-conversion molds (e.g. nextflow-test-to-target-tests) to reconstruct equivalent assertions in target frameworks without re-parsing Groovy.

What was not changed despite biting:
- TestFixtures stayed singular. Multiple test profiles surfaced via `nf_tests[]` rather than promoting `test_fixtures` to an array — this preserves backward compatibility and keeps the "data shape of the selected profile" abstraction.
- Mulled-v2 multi-package containers, multi-dependency `environment.yml`, multiMap/.branch/.cross fan-out, conditional channel construction, .mix-then-reassign — all still have only one bite each (bacass), so deferred per the "grow from contact" rule. They're recorded in `content/log.md` and the relevant notes' Open gaps sections; if rnaseq/sarek shows the same patterns, the schema gets bumped again.

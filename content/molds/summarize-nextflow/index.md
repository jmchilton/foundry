---
type: mold
name: summarize-nextflow
axis: source-specific
source: nextflow
tags:
  - mold
  - source/nextflow
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 2
ai_generated: true
output_schemas:
  - "content/schemas/summary-nextflow.schema.json"
related_notes:
  - "[[summary-nextflow]]"
summary: "Read a Nextflow pipeline source tree and emit a structured per-source summary downstream Molds bind to."
---

# summarize-nextflow

Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary describing its processes, channels, conditionals, containers, parameters, and test fixtures. Source-specific (Nextflow), target-agnostic. The summary is the input to every downstream Mold in the `NEXTFLOW → GALAXY` and `NEXTFLOW → CWL` pipelines: `summary-to-galaxy-data-flow`, `summary-to-cwl-data-flow`, `author-galaxy-tool-wrapper` (for the container/conda block), and `nextflow-test-to-target-tests` (for the test-fixture block).

This Mold owns **only the read-and-structure step**. Every cross-source-and-target translation lives downstream; this Mold is responsible for surfacing what exists in the NF tree honestly, not for reshaping it toward Galaxy or CWL idioms.

The output schema is per-source by design — see [[GXY_SKETCHES_ALIGNMENT]] for why a forced-shared cross-source summary shape was rejected.

## Inputs

The Mold expects:

- A **path or git URL** to the NF pipeline. Local clone is preferred; a git URL triggers a shallow clone the cast skill manages.
- Optional **pin**: tag, branch, or commit SHA. Mirrors `SketchSource` semantics from gxy-sketches.
- Optional **profile hint** (`test`, `test_full`, …) selecting which `conf/<profile>.config` to read for fixtures. Defaults to `test`.

The Mold does **not** accept "summarize this single subworkflow" subset hints; whole-pipeline summary is the unit. Subset summarization is an open question — see Non-goals.

## Outputs

A single JSON document conforming to [[summary-nextflow]] (`content/schemas/summary-nextflow.schema.json`). Sketch shape:

```jsonc
{
  "source": {                                  // mirrors SketchSource
    "ecosystem": "nf-core" | "nextflow",
    "workflow": "rnaseq",
    "url": "https://github.com/nf-core/rnaseq",
    "version": "3.14.0",                       // tag or commit SHA
    "license": "MIT",
    "slug": "nf-core-rnaseq"
  },
  "params": [
    { "name": "input", "type": "path", "default": null,
      "description": "Samplesheet CSV", "required": true }
  ],
  "profiles": ["test", "test_full", "docker", "singularity", "conda"],
  "tools": [                                   // mirrors gxy-sketches ToolSpec, augmented
    { "name": "fastp", "version": "0.23.4",
      "biocontainer": "quay.io/biocontainers/fastp:0.23.4--h5f740d0_0",
      "bioconda": "bioconda::fastp=0.23.4",
      "docker": null, "singularity": null }
  ],
  "processes": [
    { "name": "FASTP",
      "module_path": "modules/nf-core/fastp/main.nf",
      "tool": "fastp",                         // FK into tools[].name
      "container": "quay.io/biocontainers/fastp:0.23.4--h5f740d0_0",
      "inputs":  [ { "name": "reads", "shape": "tuple(meta, [path,path])",
                     "description": "..." } ],
      "outputs": [ { "name": "json", "shape": "tuple(meta, path)",
                     "description": "..." } ],
      "when": null,
      "script_summary": "trim adapters and filter reads by quality",
      "publish_dir": "fastp" }
  ],
  "subworkflows": [
    { "name": "FASTQ_TRIM_FASTP_FASTQC",
      "path": "subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf",
      "calls": ["FASTP", "FASTQC_RAW", "FASTQC_TRIM"],
      "inputs": [], "outputs": [] }
  ],
  "workflow": {
    "name": "RNASEQ",
    "channels": [
      { "name": "ch_samplesheet",
        "source": "Channel.fromSamplesheet('input')",
        "shape": "tuple(meta, [path,path])" }
    ],
    "edges": [
      { "from": "ch_samplesheet", "to": "FASTP", "via": [] },
      { "from": "FASTP.out.reads", "to": "STAR_ALIGN",
        "via": ["map", "join"] }
    ],
    "conditionals": [
      { "guard": "params.skip_alignment", "branch": "alternate",
        "affects": ["STAR_ALIGN"] }
    ]
  },
  "test_fixtures": {
    "profile": "test",
    "inputs":  [ /* TestDataRef-shaped */ ],
    "outputs": [ /* ExpectedOutputRef-shaped */ ]
  }
}
```

Field-name parity with gxy-sketches (`SketchSource`, `ToolSpec`, `TestDataRef`, `ExpectedOutputRef`) is intentional and load-bearing — see [[GXY_SKETCHES_ALIGNMENT]] §1-3.

## Procedure

The cast skill is **not a single LLM prompt** over the source tree. It is a small program with one or two embedded LLM calls. The split is:

- **Deterministic:** locate files, parse `nextflow.config` and `nextflow_schema.json`, regex-tokenize `process` blocks for typed fields (name, container, conda, declared IO channel names, `when:` guards, `publishDir`), read nf-core module `meta.yml` verbatim, enumerate `include { X } from '...'` for the call graph, resolve biocontainer image strings.
- **LLM-driven:** one-line summary of each process `script:` body, reconciliation of operator-chained channel paths (`A | map | join(B) | groupTuple`) into the workflow `edges[]`, free-text `description` / `notes` fields, IO inference when `meta.yml` is absent and the script is the only signal.

Everything the schema demands as a typed enum or path is deterministic. Free-text fields are LLM. The schema enforces that boundary by typing.

### 1. Detect pipeline shape

Branch shallow on layout:
- nf-core: `nextflow.config` declares `manifest.name = 'nf-core/...'`; `modules/nf-core/`, `subworkflows/nf-core/`, and `nextflow_schema.json` are present. Prefer `meta.yml` as IO ground truth.
- ad-hoc DSL2: no `nextflow_schema.json`, no module `meta.yml`. Falls back to `script:`-block IO inference.
- DSL1: rare; emit the `source` block and exit early with a `warnings[]` entry. Out of scope for v1.

### 2. Capture provenance

Populate `source` from `git remote get-url`, `git rev-parse HEAD` (or the user-supplied pin), `manifest.name` / `manifest.homePage` / `manifest.version` in `nextflow.config`, and `LICENSE` filename detection. `slug` is kebab of `<owner>-<repo>` for nf-core, kebab of repo basename otherwise.

### 3. Parse parameters and profiles

Read `nextflow.config` `params { ... }` block for defaults. When `nextflow_schema.json` exists (nf-core), prefer it as the source of truth for `type`, `description`, and `required` — it is real JSON Schema, copy verbatim. Enumerate `profiles { ... }` keys.

### 4. Enumerate processes

For each `process <NAME> { ... }` in `main.nf`, `workflows/`, `modules/**`, `subworkflows/**`:
- Pull `container`, `conda`, `publishDir`, `when:` directives verbatim.
- Tokenize the `input:` and `output:` blocks for declared channel names and shapes — typed channels (`tuple val(meta), path(reads)`) become shape strings (`"tuple(meta, [path])"`); arity is preserved as a string, not structured.
- Where `meta.yml` exists, **use it** for `description` and IO documentation rather than parsing the `script:` block.
- LLM call (one per process, batchable): summarize the `script:` body in one line. Pass the script verbatim plus the declared IO; ask only for what the tool *does*.

### 5. Build the tool registry

Walk the per-process `container` and `conda` directives. Resolve in priority order:
1. `quay.io/biocontainers/<name>:<version>--<build>` → split into `name`, `version`, biocontainer image string.
2. Other Docker registry refs → keep verbatim in `docker`.
3. Singularity image refs → keep verbatim in `singularity`.
4. `bioconda::<name>=<version>` → `bioconda` field.

Deduplicate by `(name, version)` across processes; one entry per tool. `processes[].tool` is a foreign key into `tools[].name`. This block is the bridge to `[[author-galaxy-tool-wrapper]]` — it consumes container/conda info to translate into Galaxy `<requirements>`.

### 6. Reconcile the workflow DAG

Enumerate the top-level workflow's `include` statements and channel construction (`Channel.fromPath`, `Channel.fromFilePairs`, `Channel.fromSamplesheet`, `params.*`). For operator chains, the deterministic parser records the *literal* chain (`["map", "join", "groupTuple"]` in `via`). Reconciling chained operators into a coherent `from → to` edge is the second LLM call: given the literal chain, the source channel shape, and the downstream process's declared input shape, emit the resolved edge.

Workflow-level conditionals (`if (params.skip_alignment) { ... }`) emit `conditionals[]` entries with the guard, the branch (`alternate` vs `default`), and the set of processes affected.

### 7. Surface test fixtures

Read `conf/<profile>.config` (default `conf/test.config`) for `params.input` (samplesheet URL) and any other URL-shaped params. For nf-core pipelines, follow the samplesheet URL into the `nf-core/test-datasets` repo if a single fetch is enough to enumerate the file paths it references; otherwise emit the samplesheet URL alone as the input.

Each entry follows `TestDataRef` (inputs) / `ExpectedOutputRef` (outputs) field names verbatim. The `path` vs `url` rules from gxy-sketches' `TestDataRef` carry over; the "must be under `test_data/`" constraint does **not** — see [[GXY_SKETCHES_ALIGNMENT]] §1.

If `tests/` contains nf-test fixtures, surface those too; assertion shapes go into `outputs[].assertions[]` if they are simple equality / regex / `containsString` checks. Complex Groovy assertions are summarized to prose and stored as a single string assertion — flag with a `warnings[]` entry that the assertion is lossy.

### 8. Validate and emit

Validate the assembled object against `schemas/summary-nextflow.schema.json` before emitting. On schema failure, the cast skill should fail loud — the downstream Molds bind to the schema and will produce worse errors later. `additionalProperties: false` at every level catches drift early.

## Caveats baked into the procedure

The procedure assumes — and the cast skill must surface in `warnings[]` when relevant — the following NF realities:

- **DSL1 pipelines are out of scope.** Detected via the absence of DSL2 syntax (`workflow { ... }` block); emit a single warning and exit with the provenance block only.
- **`meta.yml` may lie.** nf-core module `meta.yml` is hand-authored and can drift from the actual `script:` IO. When the LLM-inferred IO disagrees with `meta.yml`, prefer `meta.yml` and surface the disagreement as a warning rather than overriding it.
- **Channel shapes are strings, not structured types.** `"tuple(meta, [path,path])"` is enough for downstream Molds to reason about; structured channel typing is a research project. Downstream Molds that need structure must parse the string.
- **Operator chains are summarized, not executed.** The LLM reconciliation pass is best-effort. Workflows with deeply nested closures (`map { ... }` with substantial Groovy logic) may produce edges flagged with low confidence in `notes`.
- **`include` aliasing is followed one level.** `include { FASTP as TRIM_PROC } from '...'` resolves to `FASTP` in `processes[].name` and the alias is recorded in the call graph. Multi-level aliasing chains are not chased.
- **Test-fixture URLs are not fetched for content validation.** The Mold records URL, role, filetype, and (when present) expected SHA-1; it does not download files to verify they exist.

## Non-goals

- **Subset summarization.** Whole-pipeline only. A single-subworkflow summarizer might land later, but the schema and downstream Molds assume the whole-pipeline shape today.
- **Translation to a target idiom.** This Mold does not produce Galaxy collections, CWL scatter, or any target-shaped data flow. Those live in `[[summary-to-galaxy-data-flow]]` / `[[summary-to-cwl-data-flow]]`.
- **Tool wrapping.** Container/conda info is captured for `[[author-galaxy-tool-wrapper]]` to consume; this Mold never authors a wrapper.
- **Test execution.** Fixtures are described, not run. `[[run-workflow-test]]` owns execution.
- **Schema evolution.** The schema at [[summary-nextflow]] is v1, draft. Adding fields requires evaluating against the §"Reference dispatch" exemplars (rnaseq, sarek, one ad-hoc) before merging.

## Reference dispatch (for casting)

- `output_schemas` → [[summary-nextflow]] (`content/schemas/summary-nextflow.schema.json`) — copied verbatim into the cast bundle's `references/schemas/`. The cast skill validates its emitted JSON against this schema before returning.
- `cli_commands` — none today. Open question whether the Foundry seeds a `content/cli/nextflow/` family for `nextflow config`, `nf-core list`, `nf-test`. The cast skill calls these CLIs at runtime regardless; the question is whether the Foundry carries manpages for them.
- `patterns` — none. Per-source summarization is correctly empty here; this is the first inventory case where a Mold legitimately declares no patterns. Relevant for MOLD_SPEC.
- Research notes — pending: `[[component-nextflow-pipeline-anatomy]]` (DSL2 layout, channel idioms), `[[component-nextflow-containers-and-envs]]` (biocontainers / bioconda equivalence rules), `[[component-nextflow-testing]]` (`conf/test.config`, `nf-core/test-datasets`, nf-test). Body links above render dangling until these are seeded; they are the operational grounding for §4-7. Not packaged into the cast — the casting LLM selects only operationally relevant slices when condensing the procedural body.
- `examples` — pending: `nf-core/rnaseq` (canonical, stresses every section), `nf-core/sarek` (heavy conditional subworkflows; stresses §6's reconciliation), and one ad-hoc DSL2 pipeline (no `meta.yml`, no `nextflow_schema.json`; stresses fallback paths). Bundling vs URL-referencing is open — `rnaseq` is too large to mirror; the corpus-first principle says cite by URL. See [[GXY_SKETCHES_ALIGNMENT]] for the analogous bundle-vs-URL discussion in gxy-sketches.

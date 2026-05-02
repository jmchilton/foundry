---
name: summarize-nextflow
description: Read a Nextflow pipeline source tree (nf-core or ad-hoc DSL2) and emit a structured JSON summary describing processes, channels, conditionals, containers, parameters, and test fixtures. Source-specific (Nextflow), target-agnostic. Output validates against references/schemas/summary-nextflow.schema.json. Use when asked to summarize, inventory, or characterize a Nextflow pipeline before translating it (to Galaxy, CWL, etc.) or comparing it across pipelines.
---

# summarize-nextflow

Emit a structured JSON summary of a Nextflow pipeline. The summary is target-agnostic — it surfaces what exists in the NF tree honestly, never reshapes it toward Galaxy/CWL idioms. Downstream skills consume this output for translation, wrapping, and test conversion.

The output JSON **must** validate against `references/schemas/summary-nextflow.schema.json`. Validate before returning. `additionalProperties: false` at every level — no extra fields.

## Inputs

- **Path or git URL** to the NF pipeline (local clone preferred; clone shallow if URL).
- Optional **pin**: tag, branch, or commit SHA.
- Optional **profile hint** (`test`, `test_full`, …) selecting which `conf/<profile>.config` to read for fixtures. Defaults to `test`.

Whole-pipeline only. Subset / single-subworkflow summarization is out of scope.

## Method

The work is a small program with embedded LLM judgment, not one big prompt over the source tree:

- **Deterministic** (do these mechanically, no LLM): locate files, parse `nextflow.config` and `nextflow_schema.json`, regex-tokenize `process` blocks for typed fields, read nf-core module `meta.yml` and module `environment.yml` verbatim, enumerate `include { X } from '...'`, resolve container/conda directive ternaries.
- **LLM-driven**: one-line summary of each process `script:` body, reconciliation of operator-chained channel paths into workflow `edges[]`, free-text `description` / `notes` fields, IO inference when `meta.yml` is absent.

Schema-typed enums and paths are deterministic. Free-text fields are LLM. The schema enforces that boundary.

### 1. Detect pipeline shape

- **nf-core**: `nextflow.config` declares `manifest.name = 'nf-core/...'`; `modules/nf-core/`, `subworkflows/nf-core/`, and `nextflow_schema.json` present. Prefer `meta.yml` as IO ground truth.
- **Ad-hoc DSL2**: no `nextflow_schema.json`, no module `meta.yml`. Fall back to `script:`-block IO inference. **Consult `references/notes/component-nextflow-pipeline-anatomy.md`** when ad-hoc layout differs from nf-core conventions in ways the rules below don't cover.
- **DSL1**: detected by absence of DSL2 `workflow { ... }` block. Emit `source` + a single `warnings[]` entry and exit. Out of scope.

Real pipelines have **multiple named workflow blocks** — typically an anonymous `workflow {}` entrypoint in `main.nf` that wires `PIPELINE_INITIALISATION → NFCORE_<NAME> → PIPELINE_COMPLETION`, plus a substantive named workflow under `workflows/<name>.nf`. Selection rule for the primary `workflow`: pick the named workflow that invokes the most pipeline processes (typically `workflows/<name>.nf`). The anonymous `workflow {}` glue and the `NFCORE_<NAME>` wrapper land in `subworkflows[]`.

### 2. Capture provenance (`source`)

Populate from `git remote get-url`, `git rev-parse HEAD` (or user-supplied pin), `manifest.{name,homePage,version}` in `nextflow.config`, and `LICENSE` filename detection. `slug` is kebab of `<owner>-<repo>` for nf-core, kebab of repo basename otherwise.

### 3. Parse parameters and profiles

- `nextflow.config` `params { ... }` block → defaults.
- When `nextflow_schema.json` exists: prefer it as truth for `type`, `description`, `required` — it is real JSON Schema, copy verbatim.
- Some params are computed at config-load time (e.g. `params.fasta = getGenomeAttribute('fasta')` in `main.nf`) and won't appear in `nextflow_schema.json`. Include them with a `description` noting the dynamic source.
- Enumerate `profiles { ... }` keys.

### 4. Enumerate processes

For each `process <NAME> { ... }` in `main.nf`, `workflows/`, `modules/**`, `subworkflows/**`:

- Pull `container`, `conda`, `publishDir`, `when:` directives **verbatim** into `processes[].container` / `processes[].conda`. Modern nf-core directives are ternary expressions and file references — keep the directive text intact and resolve into `tools[]` separately (§5).
- Tokenize `input:` and `output:` blocks for declared channel names and shapes. Typed channels (`tuple val(meta), path(reads)`) become shape strings (`"tuple(meta, [path])"`); arity preserved as string, not structured.
- Sweep all `include { ... }` statements across the pipeline (main.nf, workflows/, subworkflows/**) and populate `processes[].aliases`. `include { MINIMAP2_ALIGN as MINIMAP2_CONSENSUS }` adds `MINIMAP2_CONSENSUS` to that process's `aliases[]`. Same module can be re-imported under multiple aliases. Workflow `edges[]` reference alias names; canonical `name` is the FK target.
- Detect `topic: <name>` annotations on outputs (Nextflow 24+ channel topics — nf-core templates emit `tuple(val("${task.process}"), val('toolname'), eval(...)) topic: versions` for version aggregation). Record the topic name in `ChannelIO.topic`. Inputs and non-topic outputs leave `topic` null.
- If `meta.yml` exists, **use it** for `description` and IO documentation rather than parsing `script:`.
- One LLM call per process (batchable): summarize the `script:` body in one line. Pass script verbatim plus declared IO; ask only what the tool *does*.

### 5. Build the tool registry (`tools[]`)

**Container directives are usually ternary** of the form `"${ workflow.containerEngine == 'singularity' && !task.ext.singularity_pull_docker_container ? '<sing-uri>' : '<other-uri>' }"`. Extract both branches:

- The `singularity ?` branch typically yields `https://depot.galaxyproject.org/singularity/<name>:<version>--<build>` → `tools[].singularity`.
- The fallthrough branch resolves to one of:
  - `quay.io/biocontainers/<name>:<version>--<build>` → `tools[].biocontainer`.
  - `biocontainers/<name>:<version>--<build>` (docker.io alias for the same biocontainer image) → `tools[].biocontainer` (same field; both forms are biocontainer images).
  - `community.wave.seqera.io/library/<name>:<version>--<digest>` or `https://community-cr-prod.seqera.io/.../sha256/<digest>/data` → `tools[].wave`.
  - Anything else → `tools[].docker`.

**Conda directives are usually file references** to `${moduleDir}/environment.yml`. Read the YAML and extract its `dependencies:` list. When the list contains a single `bioconda::<name>=<version>` entry, that string becomes `tools[].bioconda`. Legacy literal-string directives (`conda "bioconda::<name>=<version>"`) feed the same field.

Tool name and version are derivable from any of the resolved fields (biocontainer/bioconda/wave/docker image string). Deduplicate by `(name, version)`. `processes[].tool` is FK into `tools[].name`.

**Consult `references/notes/component-nextflow-containers-and-envs.md`** when a directive does not fit any of the patterns above (e.g. mulled-v2 multi-package containers, custom registry, env modules, or a non-trivial environment.yml with multiple dependencies).

### 6. Reconcile the workflow DAG

Enumerate the primary workflow's `include` statements and channel construction (`Channel.fromPath`, `Channel.fromFilePairs`, `Channel.fromSamplesheet`, `params.*`, `channel.empty()`, `channel.topic('<name>')`).

For operator chains: the deterministic parser records the *literal* chain (`["map", "join", "groupTuple"]` in `via`). LLM reconciles the chain into a coherent `from → to` edge: given the literal chain, source channel shape, and downstream process input shape, emit the resolved edge.

Workflow-level conditionals (`if (params.skip_alignment) { ... }`) → `conditionals[]` entries with guard, branch (`alternate` vs `default`), and processes affected.

Subworkflows split into two kinds via `Subworkflow.kind`:

- `kind: pipeline` — invokes pipeline processes (data-flow contributor). The `NFCORE_<NAME>` wrapper and any nested `subworkflows/local/` that calls processes.
- `kind: utility` — composes free-function calls only (`paramsHelp`, `samplesheetToList`, `completionEmail`, `imNotification`). nf-core template subworkflows like `PIPELINE_INITIALISATION` and `PIPELINE_COMPLETION` are always utility. `Subworkflow.calls` is empty for utilities; their job is to expose channel outputs (e.g. the validated samplesheet) the primary workflow consumes.

Free-function calls in the primary workflow body itself (`paramsSummaryMap`, `softwareVersionsToYAML`, `methodsDescriptionText`) are not modeled as processes or subworkflows. Their channel outputs flow into `workflow.channels[]`; the function names are nf-core template idiom.

Operator chains with deeply nested closures may produce edges flagged with low confidence in `notes`.

### 7. Surface test fixtures and nf-tests

**Two outputs from this step.**

**`test_fixtures`** — input data shape for the *selected* profile (default `test`). Read `conf/<profile>.config` for `params.input` (samplesheet URL) and any URL-shaped params. For nf-core: follow samplesheet URL into `nf-core/test-datasets` if a single fetch enumerates referenced files; else emit samplesheet URL alone. Samplesheet URL may be a runtime concatenation (`params.pipelines_testdata_base_path + 'foo.csv'`) — resolve and record the resolved URL. Note: the samplesheet may live on a *different pipeline's* test-dataset branch (e.g. demo borrows from viralrecon).

Each entry follows `TestDataRef` (inputs) / `ExpectedOutputRef` (outputs) field names verbatim. The "must be under `test_data/`" constraint does **not** carry over from gxy-sketches.

**`nf_tests[]`** — one entry per `tests/*.nf.test` file (real pipelines have one .nf.test per test profile; bacass has 9). For each file, populate:

- `name` = the description string in `test("...")`.
- `path` = repo-relative file path.
- `profiles[]` = file-level `profile "<name>"` declaration plus per-test config overrides (usually a single profile).
- `params_overrides` = the `when { params { ... } }` block as a key→value map.
- `assert_workflow_success` = `true` when the test asserts `workflow.success`.
- `snapshot` = a structured `SnapshotFixture` when an `assert snapshot(...).match()` clause is present, else `null`. Extract:
  - `captures[]` = logical names of values passed to `snapshot(...)` (typical nf-core set: `succeeded_task_count`, `versions_yml`, `stable_names`, `stable_paths`).
  - `helpers[]` = nf-test helper functions invoked (`getAllFilesFromDir`, `removeNextflowVersion`, ...).
  - `ignore_files[]` = repo-relative paths passed as `ignoreFile:` (e.g. `tests/.nftignore`).
  - `ignore_globs[]` = inline `ignore: [...]` glob list (e.g. `['Prokka/**', '**/multiqc_busco.yaml']`).
  - `snap_path` = repo-relative path of the corresponding `.nf.test.snap`.
- `prose_assertions[]` = other complex/non-snapshot assertions summarized to prose. Empty for snapshot-only tests, which is the common nf-core case.

**Consult `references/notes/component-nextflow-testing.md`** when fixtures use a layout outside `conf/test.config` + nf-test (e.g. legacy `test/` scripts, external test harnesses) or when assertions don't fit the snapshot+success-flag pattern.

### 8. Validate and emit

Validate the assembled object against `references/schemas/summary-nextflow.schema.json` before emitting. **Fail loud** on schema failure — downstream skills bind to the schema and will produce worse errors later.

## Caveats — surface in `warnings[]` when relevant

- **DSL1**: out of scope; emit provenance + warning, exit.
- **`meta.yml` may lie.** When LLM-inferred IO disagrees with `meta.yml`, prefer `meta.yml` and surface the disagreement as a warning rather than overriding.
- **Channel shapes are strings, not structured types.** `"tuple(meta, [path,path])"` — downstream skills that need structure must parse the string.
- **Operator chains are summarized, not executed.** Best-effort.
- **`include` aliasing followed one level only.** `include { FASTP as TRIM_PROC }` resolves to `FASTP` in `processes[].name`; alias recorded in call graph. Multi-level chains not chased.
- **Test-fixture URLs not fetched for content validation.** Record URL, role, filetype, expected SHA-1 if present; do not download.
- **Snapshot-based nf-test assertions are lossy.** Prose summarization in `assertions[]` is intentional; structured snapshot-fixture support is deferred.

## Non-goals

- Subset summarization (whole-pipeline only).
- Translation to a target idiom (Galaxy collections, CWL scatter — those are downstream skills).
- Tool wrapping (consumes container/conda info; never authors a wrapper).
- Test execution (fixtures described, not run).

## Reference dispatch

- `references/schemas/summary-nextflow.schema.json` — **always** validate output against this before emitting.
- `references/notes/component-nextflow-pipeline-anatomy.md` — consult on ad-hoc DSL2 layouts that don't match nf-core conventions, or on workflow-block patterns the multi-workflow selection rule in §1 doesn't resolve.
- `references/notes/component-nextflow-containers-and-envs.md` — consult on container/conda directives outside the resolver patterns in §5 (mulled-v2, custom registries, env modules, multi-dependency `environment.yml`).
- `references/notes/component-nextflow-testing.md` — consult on test fixture layouts outside `conf/test.config` + nf-test, or on snapshot-fixture patterns the prose-summary fallback in §7 doesn't capture well.

The notes are stubs today; they grow from contact with real pipelines (see foundry issue #17). When you hit a gap a note doesn't cover, log it — that gap becomes the note's next paragraph.

# summarize-nextflow eval

Evaluation plan for the `summarize-nextflow` Mold and its CLI implementation
(`@galaxy-foundry/summarize-nextflow`). Cases are tagged by bucket:

- **schema** — does the emitted JSON validate?
- **fidelity** — does the JSON faithfully reflect the source pipeline?
- **utility** — can downstream Molds bind to the output without holes?
- **regression** — does a re-cast reproduce the prior committed run?

Fixtures are pinned in `workflow-fixtures/fixtures.yaml`; materialize with
`make fixtures-nextflow` before running.

## Case: schema-validates against every tier-tagged fixture

- bucket: schema
- check: deterministic
- fixture: `workflow-fixtures/pipelines/nf-core__{demo,fetchngs,hlatyping,bacass,rnaseq,sarek,taxprofiler}`
- expectation: CLI exits 0 and the emitted JSON validates against
  `content/schemas/summary-nextflow.schema.json` with `additionalProperties: false`.

## Case: schema-validation failure surfaces, does not silently emit

- bucket: schema
- check: deterministic
- fixture: a pipeline (or synthetic tree) that drives the resolver into a
  shape the schema rejects (e.g. missing required `source.workflow`).
- expectation: CLI exits 3 (schema validation failure) and prints the AJV
  error path; nothing partial is written to `--out`.

## Case: DSL1 short-circuit

- bucket: schema
- check: deterministic
- fixture: a synthetic tree without a `workflow { ... }` block.
- expectation: emits the `source` block plus a `warnings[]` entry naming
  DSL1; does not invent processes/channels.

## Case: process inventory matches grep ground truth

- bucket: fidelity
- check: deterministic
- fixture: each pipeline above; ground truth from a shell grep over
  `main.nf`, `workflows/`, `modules/**`, `subworkflows/**`.
- expectation: `processes[].length` matches the corpus-observed count
  modulo aliases (aliases are merged into a single `processes[]` entry
  with the imports recorded under `aliases[]`).

## Case: alias sweep on bacass

- bucket: fidelity
- check: deterministic
- fixture: `nf-core__bacass` (known to import `MINIMAP2_ALIGN` three times
  under aliases like `MINIMAP2_CONSENSUS`, `MINIMAP2_POLISH`).
- expectation: `processes[].aliases[]` contains every `include { X as Y }`
  rename for `MINIMAP2_ALIGN` and `FASTQC`.

## Case: tool registry covers every container directive

- bucket: fidelity
- check: deterministic
- fixture: each pipeline's resolved per-process container directives.
- expectation: every `processes[].tool` is a foreign key into a `tools[]`
  entry; every container/conda directive resolves to at least one of
  `biocontainer`, `bioconda`, `singularity`, `docker`, or `wave`. Unresolved
  directives appear in `warnings[]` with the directive verbatim.

## Case: nf-test enumeration matches filesystem

- bucket: fidelity
- check: deterministic
- fixture: each pipeline's `tests/*.nf.test` file tree.
- expectation: `nf_tests[].length` equals the file count; each entry has
  `path`, `profiles[]`, and a `snapshot` block when the file contains
  `assert snapshot(...).match()`.

## Case: test-fixture localization round-trip

- bucket: fidelity
- check: deterministic
- fixture: any pipeline run with `--fetch-test-data --test-data-dir=<tmp>`.
- expectation: every remote `test_fixtures.inputs[].url` has a corresponding
  on-disk `path`; SHA-1 hashes are stable across two runs.

## Case: ad-hoc DSL2 fallback

- bucket: fidelity
- check: llm-judged
- fixture: a non-nf-core DSL2 pipeline lacking `nextflow_schema.json` and
  per-module `meta.yml` (placeholder; corpus addition pending).
- expectation: process IO is inferred from `script:` blocks rather than
  invented from absent metadata; `warnings[]` notes the missing nf-core
  affordances.

## Case: data-flow Mold can bind without holes

- bucket: utility
- check: llm-judged
- fixture: a `summarize-nextflow` output for a non-trivial pipeline
  (e.g. bacass).
- expectation: `summary-to-galaxy-data-flow`'s cast skill consumes the JSON
  and produces a draft without "field missing" errors. Any field it
  consults that proves underspecified gets logged in `content/log.md`
  under `gap:` and triggers an Open-gaps note update.

## Case: tool-wrapper Mold can resolve every tools row

- bucket: utility
- check: llm-judged
- fixture: same JSON.
- expectation: `author-galaxy-tool-wrapper` can produce a Galaxy
  `<requirements>` block for every `tools[]` row; rows that don't yield
  a wrapper-shaped requirement are surfaced as evaluation gaps, not
  silently dropped.

## Case: nf-test to Planemo assertions translation

- bucket: utility
- check: llm-judged
- fixture: a pipeline with a representative `nf_tests[]` entry containing
  `snapshot.captures[]`.
- expectation: `nextflow-test-to-target-tests` (or its successor) maps each
  capture to a Planemo assertion or to an explicit "untranslatable" entry;
  no captures are silently elided.

## Case: bacass hand-cast diff is reproduced

- bucket: regression
- check: deterministic
- fixture: `casts/claude/summarize-nextflow/runs/nf-core__bacass/summary.json`
  (current committed run).
- expectation: re-running the CLI against the pinned bacass fixture
  produces a JSON whose normalized form (sorted keys, stable ordering)
  is byte-identical to the committed run, or the diff is intentional and
  recorded as a schema/mold revision bump.

## Case: demo hand-cast diff is reproduced

- bucket: regression
- check: deterministic
- fixture: `casts/claude/summarize-nextflow/runs/nf-core__demo/summary.json`.
- expectation: same contract as bacass.

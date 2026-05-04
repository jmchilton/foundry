---
type: mold
name: summarize-galaxy-tool
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-04
revision: 4
ai_generated: true
summary: "Pull JSON schema, container, source, inputs/outputs for a Galaxy tool."
references:
  - kind: research
    ref: "[[galaxy-tool-summary-input-source]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Treat cached ParsedTool JSON from galaxy-tool-cache as the v1 input source for Galaxy tool summaries."
    verification: "Summarize FastQC, bwa_mem2, and samtools_sort from cached ParsedTool JSON and confirm downstream step implementation can bind inputs and outputs."
  - kind: research
    ref: "[[component-tool-shed-search]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Resolve Galaxy tool identity, Tool Shed versioning, and changeset context before summarizing a wrapper."
    trigger: "When a tool summary starts from a Tool Shed hit rather than an installed Galaxy tool object."
  - kind: research
    ref: "[[component-nextflow-containers-and-envs]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify wrapper package and container requirements consistently with Nextflow-derived requirement evidence."
    trigger: "When comparing an existing Galaxy wrapper's declared requirements against Nextflow container or conda evidence."
---
# summarize-galaxy-tool

Read a cached Galaxy `ParsedTool` object for an existing wrapper and emit a compact tool summary that downstream step implementation can bind to. This Mold runs after `[[discover-shed-tool]]` has selected a Tool Shed pin and after the caller has populated `galaxy-tool-cache` for that pin.

This Mold owns the **wrapper summarization** step only. It does not search the Tool Shed, choose a version, author XML, or decide how a workflow step should use the wrapper. Its job is to preserve the wrapper's executable contract: identity, command shape, inputs, outputs, requirements, tests, and any conditional or data-table behavior that could affect binding.

The v1 input-source decision is [[galaxy-tool-summary-input-source]]: read cached ParsedTool JSON, using raw XML only as supporting evidence when the cache object is lossy or ambiguous.

## Inputs

The Mold expects:

- A Tool Shed pin from `[[discover-shed-tool]]`: `tool_shed_url`, `owner`, `repo`, `tool_id`, `version`, and `changeset_revision`.
- A `galaxy-tool-cache` directory containing the cached ParsedTool JSON for that pin.
- Optional raw XML source for ambiguity checks, normally fetched through cache metadata rather than treated as the primary input.
- Optional step intent from the caller, used only to prioritize which wrapper details to explain; it must not change the wrapper facts.

## Outputs

A single JSON document conforming to the future `summary-galaxy-tool` schema. Sketch shape:

```jsonc
{
  "source": {
    "kind": "toolshed",
    "tool_shed_url": "https://toolshed.g2.bx.psu.edu",
    "owner": "devteam",
    "repo": "fastqc",
    "tool_id": "fastqc",
    "version": "0.74+galaxy0",
    "changeset_revision": "5ec9f6bceaee"
  },
  "tool": {
    "id": "toolshed.g2.bx.psu.edu/repos/devteam/fastqc/fastqc/0.74+galaxy0",
    "name": "FastQC",
    "description": "Read quality reports",
    "profile": "22.05",
    "version_command": "fastqc --version"
  },
  "requirements": [
    { "type": "package", "name": "fastqc", "version": "0.74" }
  ],
  "command": {
    "template": "fastqc ...",
    "strict_shell": true,
    "stdio": [],
    "environment": []
  },
  "inputs": [
    { "name": "input_file", "type": "data", "format": ["fastq", "fastqsanger"], "optional": false }
  ],
  "outputs": [
    { "name": "html_file", "type": "data", "format": "html", "from_work_dir": null }
  ],
  "conditionals": [],
  "data_tables": [],
  "tests": [],
  "warnings": []
}
```

Field-name parity with `summary-nextflow.tools[]` should be preserved where concepts match (`name`, `version`, container/package evidence), but Galaxy wrapper-specific structure belongs here rather than being forced into the Nextflow schema.

## Procedure

### 1. Load the cached wrapper

Locate the ParsedTool JSON in the configured `galaxy-tool-cache` directory using the Tool Shed pin. Fail early if the cache entry is missing; do not silently re-search the Tool Shed.

Confirm the cached identity matches the requested pin. If the cache exposes a tool id or version that conflicts with the pin, emit a hard failure rather than summarizing the wrong wrapper.

### 2. Capture identity and provenance

Populate `source` from the discovery pin and cache metadata. Populate `tool` from the parsed wrapper identity fields, not from the search hit. Search hits can omit version and changeset detail.

Keep both forms when they differ:

- Short XML `id` for human matching.
- Fully qualified installed Tool Shed id for gxformat2 step binding.

### 3. Extract executable requirements

Read `<requirements>` into structured package/container requirements. Preserve requirement `type`, `name`, `version`, and any container URI or resolver hints exposed by the cache.

Do not invent Bioconda equivalences here. Equivalence inference belongs to `[[author-galaxy-tool-wrapper]]` when authoring a new XML wrapper. Existing wrapper summaries report what the wrapper declares.

### 4. Summarize command and failure behavior

Preserve the command template enough for downstream binding to understand which inputs and parameters are consumed. Record strict-shell, stdio regexes, exit-code handling, environment variables, and dynamic output behavior when present.

The command summary should be readable, but lossy prose is not enough. Keep template fragments and wrapper flags where they affect required inputs, output discovery, or runtime failure classification.

### 5. Enumerate inputs

For every wrapper input parameter, emit:

- `name` and label/help text when available.
- Parameter kind (`data`, `data_collection`, `select`, `integer`, `float`, `boolean`, `text`, conditional section, repeat, section).
- Required/optional/default semantics.
- Datatypes, collection types, and multiple-value behavior.
- Select choices and dynamic options when statically available.
- Data-table references separately from user-provided parameters.

Nested conditionals must preserve branch ownership. Do not flatten `when` branches into independent parameters without recording the controlling selector and branch value.

### 6. Enumerate outputs

For every output and collection output, emit:

- Output name, datatype, label, and `from_work_dir` or discovery rule when available.
- Conditional output ownership.
- Dynamic output collection shape and naming rules.
- Relationship to input collections when the wrapper maps over or preserves identifiers.

If output discovery depends on runtime filenames, record that as a warning for downstream test and debug Molds.

### 7. Capture tests and citations

Summarize wrapper tests into input fixture expectations, parameter settings, and output assertions. Do not treat wrapper tests as workflow tests; they are evidence about legal parameter combinations and output behavior.

Preserve citations, help text, and upstream URLs when present because they help resolve ambiguous wrappers during review.

### 8. Emit warnings

Warnings should identify missing or lossy surfaces, especially:

- ParsedTool JSON omits raw XML behavior that affects binding.
- Conditional inputs cannot be reconstructed completely.
- Dynamic data-table options require Galaxy instance configuration.
- Output discovery is runtime-dependent.
- Tests are absent or too thin to confirm key outputs.

## Non-goals

- **Tool discovery.** Use `[[discover-shed-tool]]` before this Mold.
- **Wrapper authoring.** Use `[[author-galaxy-tool-wrapper]]` when no acceptable wrapper exists.
- **Step implementation.** `[[implement-galaxy-tool-step]]` binds abstract workflow intent to this summary.
- **Installed-Galaxy-only wrappers.** Deferred until a Galaxy API discovery/input path exists.
- **Schema invention at runtime.** The generated skill should validate against `summary-galaxy-tool` once that schema is authored; until then, keep output shape close to this body and eval expectations.

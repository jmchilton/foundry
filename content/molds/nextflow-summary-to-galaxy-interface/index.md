---
type: mold
name: nextflow-summary-to-galaxy-interface
axis: source-specific
source: nextflow
target: galaxy
tags:
  - mold
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Map a Nextflow summary into a Galaxy workflow interface design brief."
input_artifacts:
  - id: summary-nextflow
    description: "Structured Nextflow pipeline summary emitted by [[summarize-nextflow]]; the source-of-truth JSON for interface choices."
output_artifacts:
  - id: nextflow-galaxy-interface
    kind: markdown
    default_filename: nextflow-galaxy-interface.md
    description: "Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, collection shapes, checkpoint outputs, source provenance."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read source-level channel, parameter, process, and test-fixture evidence before choosing Galaxy workflow inputs and outputs."
  - kind: research
    ref: "[[nextflow-to-galaxy-channel-shape-mapping]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose Galaxy File/list/paired/list:paired/list:list interface shapes from Nextflow channel shapes."
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose stable workflow input/output labels and promoted checkpoint outputs that future tests can address."
    trigger: "When deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs."
  - kind: research
    ref: "[[galaxy-sample-sheet-collections]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Pick the right sample_sheet variant and translate nf-schema column metadata into Galaxy column_definitions when the source pipeline uses sample-sheet-shaped inputs."
    trigger: "When the Nextflow summary reports a samplesheetToList materialization, a parameter whose nf-schema entry sets schema: assets/schema_*.json, or a channel built from splitCsv(header: true) over a tabular params input."
related_notes:
  - "[[summary-nextflow]]"
---
# nextflow-summary-to-galaxy-interface

Read a Nextflow summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Capture workflow inputs, workflow outputs, labels, Galaxy collection shapes, checkpoint outputs worth exposing for tests, source-summary provenance, confidence, and open questions.

The output is not a gxformat2 skeleton and not a workflow schema. It is a design handoff consumed by [[nextflow-summary-to-galaxy-data-flow]], [[nextflow-summary-to-galaxy-template]], and later test-plan work.

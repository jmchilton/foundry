---
type: mold
name: summary-to-galaxy-data-flow
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Abstract DAG with Galaxy collection / scatter / branching idioms surfaced."
references:
  - kind: schema
    ref: "content/schemas/summary-nextflow.schema.json"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read the Nextflow summary contract this Mold consumes when translating source data flow."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Map Nextflow fan-out/fan-in shapes onto Galaxy collection mapping and reduction behavior."
    trigger: "When a channel edge involves collection mapping, reduction, nesting, or paired/list shape changes."
  - kind: research
    ref: "[[galaxy-collection-tools]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose Galaxy built-in collection-operation tools for shape-only data-flow transformations."
    trigger: "When the Galaxy data-flow draft needs explicit collection construction, filtering, flattening, zipping, or relabeling."
  - kind: research
    ref: "[[galaxy-apply-rules-dsl]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Represent identifier-derived collection reshaping with Apply Rules when simpler collection tools are insufficient."
    trigger: "When channel identifiers need regex extraction, regrouping, nesting-level swaps, or paired identifier construction."
  - kind: research
    ref: "[[iwc-transformations-survey]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground collection-shape translation choices in observed IWC transformation recipes."
    trigger: "When selecting between Galaxy collection-operation recipes or checking whether a proposed shape transform is corpus-attested."
  - kind: research
    ref: "[[iwc-tabular-operations-survey]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground tabular bridge choices that appear while translating Nextflow channel/data-flow operations."
    trigger: "When data-flow translation leaves collection-land for tabular projection, filtering, joining, aggregation, or pivoting."
---
# summary-to-galaxy-data-flow

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

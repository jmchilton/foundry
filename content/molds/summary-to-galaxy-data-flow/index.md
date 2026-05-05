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
revised: 2026-05-02
revision: 2
ai_generated: true
related_notes:
  - "[[summary-nextflow]]"
summary: "Abstract DAG with Galaxy collection / scatter / branching idioms surfaced."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
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
    ref: "[[nextflow-to-galaxy-channel-shape-mapping]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate Nextflow channel, tuple, and path shapes into Galaxy dataset and collection shapes."
    trigger: "When reading source-summary channel shapes and deciding File/list/paired/list:paired/list:list topology."
  - kind: research
    ref: "[[nextflow-operators-to-galaxy-collection-recipes]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers."
    trigger: "When source-summary edges mention map, join, groupTuple, branch, mix, combine, multiMap, or related channel operators."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep the data-flow draft boundary separate from gxformat2 templating and concrete step implementation."
    trigger: "When deciding what belongs in the abstract Galaxy data-flow draft versus later Molds."
    verification: "Promote after two worked Galaxy translations use the boundary without moving fields between Molds."
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
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground collection-shape choices in curated, corpus-observed operation and recipe patterns."
    trigger: "When selecting between collection cleanup, reshape, identifier, or collection-tabular bridge patterns."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground tabular bridge and table-operation choices in curated, corpus-observed operation patterns."
    trigger: "When data-flow translation leaves collection-land for tabular projection, filtering, joining, aggregation, pivoting, or tabular-collection bridges."
---
# summary-to-galaxy-data-flow

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

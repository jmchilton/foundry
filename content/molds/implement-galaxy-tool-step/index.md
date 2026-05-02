---
type: mold
name: implement-galaxy-tool-step
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
summary: "Convert an abstract step into a concrete gxformat2 step using a tool summary."
references:
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Connect concrete Galaxy tool inputs/outputs while preserving collection mapping and reduction semantics."
    trigger: "When implementing a step with data_collection inputs, mapped outputs, reductions, or nested collection wiring."
  - kind: research
    ref: "[[galaxy-collection-tools]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Insert built-in Galaxy collection-operation steps when a direct tool connection cannot express the needed shape."
    trigger: "When a step needs collection construction, filtering, extraction, zipping, unzipping, flattening, merging, or relabeling."
  - kind: research
    ref: "[[galaxy-apply-rules-dsl]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Implement identifier-derived collection reshaping via Apply Rules."
    trigger: "When collection element identifiers need regex parsing, nesting-level swaps, regrouping, or paired identifier assignment."
  - kind: research
    ref: "[[iwc-transformations-survey]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Choose corpus-attested collection recipes when implementing concrete Galaxy steps."
    trigger: "When the implementation needs cleanup-after-fanout, sync-by-identifier, singleton unboxing, relabeling, or collection-to-tabular bridges."
  - kind: research
    ref: "[[iwc-tabular-operations-survey]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Choose corpus-attested tabular/text-processing recipes when implementing concrete Galaxy steps."
    trigger: "When the implementation needs row filtering, column projection, computed columns, joins, grouping, awk, or text-processing wrappers."
---
# implement-galaxy-tool-step

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

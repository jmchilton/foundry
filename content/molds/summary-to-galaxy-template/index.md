---
type: mold
name: summary-to-galaxy-template
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
summary: "gxformat2 skeleton with per-step TODOs from a data-flow summary."
references:
  - kind: schema
    ref: "content/schemas/summary-nextflow.schema.json"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read source-level process, channel, tool, and test-fixture structure while drafting a Galaxy workflow skeleton."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Preserve Galaxy collection typing and map-over/reduction semantics in the gxformat2 skeleton."
    trigger: "When creating workflow inputs, outputs, and placeholder connections involving collections."
  - kind: research
    ref: "[[iwc-transformations-survey]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Use observed IWC collection recipes as style guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for collection cleanup, reshaping, relabeling, or identifier synchronization."
  - kind: research
    ref: "[[iwc-tabular-operations-survey]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Use observed IWC tabular recipes as style guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for tabular filtering, projection, joins, aggregation, or text-processing bridges."
---
# summary-to-galaxy-template

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

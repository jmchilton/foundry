---
type: mold
name: nextflow-summary-to-galaxy-data-flow
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
summary: "Translate a Nextflow summary into a Galaxy data-flow design brief."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read process, channel, operator, and fixture structure while drafting Galaxy-facing abstract data flow."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Keep the data-flow brief separate from gxformat2 templating and concrete step implementation."
    verification: "Promote after two worked Galaxy translations preserve this Mold boundary without moving fields."
  - kind: research
    ref: "[[nextflow-to-galaxy-channel-shape-mapping]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate Nextflow channel, tuple, and path shapes into Galaxy dataset and collection shapes."
  - kind: research
    ref: "[[nextflow-operators-to-galaxy-collection-recipes]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground collection-shape choices in curated, corpus-observed operation and recipe patterns."
    trigger: "When selecting collection cleanup, reshape, identifier, or collection-tabular bridge patterns."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Ground tabular bridge and table-operation choices in curated, corpus-observed operation patterns."
    trigger: "When data-flow translation needs filtering, joining, aggregation, pivoting, or tabular-collection bridges."
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-galaxy-interface]]"
---
# nextflow-summary-to-galaxy-data-flow

Read a Nextflow summary plus the preceding Galaxy interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, collection map/reduce choices, shape-changing placeholder transformations, unresolved Galaxy tool needs, confidence, and open questions.

The output is not gxformat2 and should not resolve exact Tool Shed tools. [[summary-to-galaxy-template]] turns this handoff and the interface brief into a skeleton.

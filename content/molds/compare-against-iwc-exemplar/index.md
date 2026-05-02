---
type: mold
name: compare-against-iwc-exemplar
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
summary: "Find nearest IWC exemplar(s) and surface a structural diff against a draft."
references:
  - kind: research
    ref: "[[iwc-nearest-exemplar-selection]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Rank IWC exemplar candidates by domain, collection topology, tool families, DAG motifs, outputs, and tests."
    trigger: "When selecting nearest IWC workflows for structural comparison against a Galaxy draft."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Compare against the draft's abstract intent without turning exemplar comparison into tool resolution."
    trigger: "When deciding whether to compare abstract data-flow, gxformat2 skeleton structure, or concrete implementation details."
    verification: "Promote after exemplar comparison flags structural issues without resolving concrete tool metadata."
  - kind: research
    ref: "[[iwc-transformations-survey]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Compare draft collection-shape recipes against corpus-observed IWC examples."
    trigger: "When the draft workflow contains collection reshape, cleanup, relabel, or synchronization sections."
  - kind: research
    ref: "[[iwc-tabular-operations-survey]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Compare draft tabular/text-processing sections against corpus-observed IWC examples."
    trigger: "When the draft workflow contains tabular filtering, projection, join, aggregation, or free-form text-processing sections."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Compare test-data placement and fixture shapes against IWC conventions."
    trigger: "When exemplar comparison includes workflow tests or input fixture organization."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Flag draft shortcuts that are accepted in IWC versus shortcuts that should be treated as smells."
    trigger: "When reviewing draft tests, assertions, labels, or expected-output comparisons."
---
# compare-against-iwc-exemplar

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

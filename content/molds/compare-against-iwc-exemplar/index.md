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
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Compare draft collection transformations against curated corpus-observed pattern guidance."
    trigger: "When the draft workflow contains collection reshape, cleanup, relabel, synchronization, or collection-tabular bridge sections."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Compare draft tabular transformations against curated corpus-observed pattern guidance."
    trigger: "When the draft workflow contains tabular filtering, projection, join, aggregation, SQL, or free-form text-processing sections."
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

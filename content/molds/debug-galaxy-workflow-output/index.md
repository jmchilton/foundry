---
type: mold
name: debug-galaxy-workflow-output
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
summary: "Triage failing Galaxy run outputs; classify failure modes; propose fixes."
references:
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Classify whether a failure is an assertion-choice problem, tolerance problem, or real workflow-output regression."
    trigger: "When Planemo reports output assertion failures or generated tests are too strict/too weak."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Decide whether a proposed debug fix aligns with accepted IWC testing shortcuts or masks a real failure."
    trigger: "When debugging suggests weakening assertions, widening deltas, switching to existence checks, or changing output labels."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Diagnose collection shape, mapping, reduction, and element-identifier mismatches in failed Galaxy runs."
    trigger: "When a failing output is a collection, a mapped output, or an unexpectedly nested/flattened structure."
---
# debug-galaxy-workflow-output

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

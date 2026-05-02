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
revised: 2026-05-02
revision: 3
ai_generated: true
summary: "Triage failing Galaxy run outputs; classify failure modes; propose fixes."
references:
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Classify whether a failure is an assertion-choice problem, tolerance problem, or real workflow-output regression."
    trigger: "When Planemo reports output assertion failures or generated tests are too strict/too weak."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Decide whether a proposed debug fix aligns with accepted IWC testing shortcuts or masks a real failure."
    trigger: "When debugging suggests weakening assertions, widening deltas, switching to existence checks, or changing output labels."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Diagnose collection shape, mapping, reduction, and element-identifier mismatches in failed Galaxy runs."
    trigger: "When a failing output is a collection, a mapped output, or an unexpectedly nested/flattened structure."
  - kind: research
    ref: "[[nextflow-operators-to-galaxy-collection-recipes]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Trace collection output failures back to possibly lossy operator translations."
    trigger: "When debugging wrong nesting, missing elements, branch merges, bad joins, or gather/reduction mismatches."
  - kind: research
    ref: "[[galaxy-tool-job-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Interpret Galaxy job-level failure evidence including stdio rules, exit code, job messages, and output dataset state."
    trigger: "When a failed workflow test includes errored jobs, tool stderr/stdout, non-zero exit codes, or red output datasets."
  - kind: research
    ref: "[[galaxy-workflow-invocation-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Interpret Galaxy invocation-level failure evidence including invocation state, structured messages, and step job summaries."
    trigger: "When a failed workflow test has invocation failure, missing workflow outputs, cancelled/paused steps, subworkflow failures, or collection population errors."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Locate which Planemo artifact or Galaxy API surface preserves the failure evidence."
    trigger: "When Planemo output is ambiguous, structured test JSON is available, or rerunning can be avoided by inspecting an existing invocation."
---
# debug-galaxy-workflow-output

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

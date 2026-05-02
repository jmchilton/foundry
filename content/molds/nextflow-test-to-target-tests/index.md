---
type: mold
name: nextflow-test-to-target-tests
axis: source-specific
source: nextflow
tags:
  - mold
  - source/nextflow
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Translate NF test fixtures into a target workflow's test format."
references:
  - kind: schema
    ref: "content/schemas/summary-nextflow.schema.json"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs."
  - kind: research
    ref: "[[component-nextflow-testing]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: hypothesis
    purpose: "Interpret nf-test profiles, snapshot assertions, and Nextflow fixture conventions before translating them."
    trigger: "When converting nf_tests, snapshot fixtures, test profiles, or source test-data references into target test plans."
    verification: "Translate nf-core/bacass nf-test snapshots into Galaxy tests and confirm this note improves profile/snapshot extraction."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Emit Galaxy/IWC-style job input fixtures, remote locations, hashes, and collection input shapes."
    trigger: "When writing job inputs or deciding whether fixtures belong in test-data, Zenodo, ENA/SRA, or CVMFS."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Choose Galaxy workflow-test assertion families and tolerances for translated expected outputs."
    trigger: "When turning Nextflow expected outputs or snapshots into Planemo assertions."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: corpus-observed
    purpose: "Distinguish accepted IWC-style test shortcuts from assertion smells while translating tests."
    trigger: "When deciding whether to use existence-only, size-only, image-dimension, or tolerant output checks."
related_notes:
  - "[[tests-format]]"
---
# nextflow-test-to-target-tests

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

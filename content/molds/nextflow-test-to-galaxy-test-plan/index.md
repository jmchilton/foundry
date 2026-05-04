---
type: mold
name: nextflow-test-to-galaxy-test-plan
axis: source-specific
source: nextflow
tags:
  - mold
  - source/nextflow
status: draft
created: 2026-04-30
revised: 2026-05-04
revision: 3
ai_generated: true
summary: "Translate Nextflow test evidence into a Galaxy workflow test plan."
references:
  - kind: schema
    ref: "content/schemas/summary-nextflow.schema.json"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs."
  - kind: schema
    ref: "content/schemas/tests.schema.json"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use the Galaxy workflow tests schema as the assertion vocabulary when translating Nextflow test evidence into a Galaxy test plan."
    trigger: "When mapping expected outputs, tolerances, snapshots, or fixture assertions into Galaxy workflow-test assertion intent."
  - kind: research
    ref: "[[component-nextflow-testing]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Interpret nf-test profiles, snapshot assertions, and Nextflow fixture conventions before translating them."
    trigger: "When converting nf_tests, snapshot fixtures, test profiles, or source test-data references into a Galaxy workflow test plan."
    verification: "Translate nf-core/bacass nf-test snapshots into a Galaxy test plan and confirm this note improves profile/snapshot extraction."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Emit Galaxy/IWC-style job input fixtures, remote locations, hashes, and collection input shapes."
    trigger: "When writing job inputs or deciding whether fixtures belong in test-data, Zenodo, ENA/SRA, or CVMFS."
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Describe Galaxy workflow-test assertion intent and tolerances for translated expected outputs."
    trigger: "When turning Nextflow expected outputs or snapshots into Galaxy test-plan assertions."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Distinguish accepted IWC-style test shortcuts from assertion smells while translating tests."
    trigger: "When deciding whether to use existence-only, size-only, image-dimension, or tolerant output checks."
related_notes:
  - "[[summary-nextflow]]"
  - "[[tests-format]]"
---
# nextflow-test-to-galaxy-test-plan

Translate Nextflow test evidence into a Galaxy workflow test plan. The output is a reviewable handoff, not a concrete `tests-format` file: preserve profile, fixture, snapshot, ignored-file, expected-output, and rationale provenance so [[implement-galaxy-workflow-test]] can author the final Galaxy test artifact with the right labels and assertions.

---
type: mold
name: nextflow-test-to-cwl-test-plan
axis: source-specific
source: nextflow
tags:
  - mold
  - source/nextflow
  - target/cwl
status: draft
created: 2026-05-03
revised: 2026-05-03
revision: 1
ai_generated: true
summary: "Translate Nextflow test evidence into a CWL workflow test plan."
related_notes:
  - "[[summary-nextflow]]"
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read summarized nf-test profiles, snapshot fixtures, selected test data, params, and expected outputs."
---
# nextflow-test-to-cwl-test-plan

Translate Nextflow test evidence into a CWL workflow test plan. This preserves the `NEXTFLOW → CWL` pipeline after the Galaxy-specific test-plan split; concrete CWL test artifact assembly remains owned by [[implement-cwl-workflow-test]].

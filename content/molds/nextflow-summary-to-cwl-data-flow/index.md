---
type: mold
name: nextflow-summary-to-cwl-data-flow
axis: source-specific
source: nextflow
target: cwl
tags:
  - mold
  - source/nextflow
  - target/cwl
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Translate a Nextflow summary into a CWL data-flow design brief."
references:
  - kind: schema
    ref: "[[summary-nextflow]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read process, channel, operator, and fixture structure while drafting CWL-facing abstract data flow."
related_notes:
  - "[[summary-nextflow]]"
  - "[[nextflow-summary-to-cwl-interface]]"
---
# nextflow-summary-to-cwl-data-flow

Read a Nextflow summary plus the preceding CWL interface brief and emit a reviewable Markdown data-flow brief. Capture abstract operations, CWL scatter/gather choices, value transformations, unresolved CommandLineTool needs, confidence, and open questions.

The output is not a concrete CWL Workflow. [[summary-to-cwl-template]] turns this handoff and the interface brief into a skeleton.

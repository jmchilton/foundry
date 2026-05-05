---
type: mold
name: summary-to-cwl-template
axis: target-specific
target: cwl
tags:
  - mold
  - target/cwl
status: draft
created: 2026-04-30
revised: 2026-05-05
revision: 2
ai_generated: true
summary: "CWL Workflow skeleton with per-step TODOs from source and design handoffs."
related_notes:
  - "[[nextflow-summary-to-cwl-interface]]"
  - "[[nextflow-summary-to-cwl-data-flow]]"
  - "[[paper-summary-to-cwl-design]]"
---
# summary-to-cwl-template

Read the original source artifact, the source summary, and all prior source-target design handoffs from the pipeline run. Emit a CWL Workflow skeleton with inputs, outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

The interface and data-flow briefs guide the skeleton, but they do not replace source evidence. Treat the prior-step index as the working context: source summary, interface brief, data-flow brief or paper design brief, and any open questions carried forward.

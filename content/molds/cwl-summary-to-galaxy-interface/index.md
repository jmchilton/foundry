---
type: mold
name: cwl-summary-to-galaxy-interface
axis: source-specific
source: cwl
target: galaxy
tags:
  - mold
  - source/cwl
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Map a CWL summary into a Galaxy workflow interface design brief."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary emitted by [[summarize-cwl]]; the source-of-truth JSON for Galaxy interface choices."
output_artifacts:
  - id: cwl-galaxy-interface
    kind: markdown
    default_filename: cwl-galaxy-interface.md
    description: "Reviewable Markdown brief: Galaxy workflow inputs, outputs, labels, exposed and checkpoint outputs, source provenance, confidence."
references:
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose stable Galaxy workflow input/output labels and promoted checkpoint outputs."
    trigger: "When deciding labels, public outputs, checkpoint outputs, or fixture-compatible collection inputs."
---
# cwl-summary-to-galaxy-interface

Read a CWL summary and emit a reviewable Markdown interface brief for a Galaxy workflow. Preserve CWL input/output intent while choosing Galaxy-facing labels, data shapes, exposed outputs, checkpoint outputs, provenance, confidence, and open questions.

The output is a design handoff, not gxformat2 and not a rich workflow schema.

---
type: mold
name: paper-summary-to-cwl-design
axis: source-specific
source: paper
target: cwl
tags:
  - mold
  - source/paper
  - target/cwl
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Translate a paper summary into a CWL workflow design brief."
---
# paper-summary-to-cwl-design

Read a paper summary and emit a reviewable Markdown CWL workflow design brief. Combine interface choices and abstract data-flow choices until paper examples justify a cleaner split.

The output is not a concrete CWL Workflow. [[summary-to-cwl-template]] turns this brief and the paper summary into a skeleton.

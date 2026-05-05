---
type: mold
name: paper-summary-to-galaxy-design
axis: source-specific
source: paper
target: galaxy
tags:
  - mold
  - source/paper
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
summary: "Translate a paper summary into a Galaxy workflow design brief."
references:
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Use the same Galaxy design-brief boundary without forcing paper-derived evidence into a source-summary schema."
    trigger: "When paper extraction has enough workflow structure to draft Galaxy interface and data-flow decisions."
    verification: "Promote after two worked paper-to-Galaxy translations show the combined design brief is enough context for template generation."
---
# paper-summary-to-galaxy-design

Read a paper summary and emit a reviewable Markdown Galaxy workflow design brief. Combine interface choices and abstract data-flow choices until paper examples justify a cleaner split.

The output is not gxformat2 and not a rich workflow schema. [[paper-summary-to-galaxy-template]] turns this brief and the paper summary into a skeleton.

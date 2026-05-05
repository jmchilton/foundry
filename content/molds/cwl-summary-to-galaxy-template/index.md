---
type: mold
name: cwl-summary-to-galaxy-template
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
summary: "gxformat2 skeleton with per-step TODOs from a CWL summary and prior Galaxy design briefs."
input_artifacts:
  - id: summary-cwl
    description: "Structured CWL summary emitted by [[summarize-cwl]]; consulted while emitting placeholder steps."
  - id: cwl-galaxy-interface
    description: "Galaxy interface brief from [[cwl-summary-to-galaxy-interface]] that pins workflow inputs, outputs, labels."
  - id: cwl-galaxy-data-flow
    description: "Galaxy data-flow brief from [[cwl-summary-to-galaxy-data-flow]] that pins abstract operations and collection choices."
output_artifacts:
  - id: galaxy-workflow-draft
    kind: yaml
    default_filename: galaxy-workflow-draft.gxwf.yml
    description: "gxformat2 skeleton: workflow inputs, outputs, placeholder steps, rough connections, TODO slots for later implementation Molds."
references:
  - kind: research
    ref: "[[galaxy-workflow-testability-design]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Choose stable workflow input/output labels, testable checkpoint outputs, and fixture-compatible workflow interfaces while drafting the skeleton."
    trigger: "When the template decides workflow inputs, workflow outputs, promoted checkpoints, or collection output identifiers that future tests will need to address."
  - kind: research
    ref: "[[galaxy-collection-semantics]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Translate CWL arrays, records, scatter, and secondary-file shapes into Galaxy collection typing and map-over/reduction semantics."
    trigger: "When creating workflow inputs, outputs, and placeholder connections involving collections."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Respect the handoff from abstract data-flow draft to gxformat2 skeleton."
    trigger: "When translating abstract nodes, unresolved tool needs, and placeholder transformations into template TODOs."
    verification: "Promote after two worked CWL-to-Galaxy templates preserve the data-flow/template split without schema changes."
  - kind: research
    ref: "[[iwc-nearest-exemplar-selection]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Select likely IWC comparison targets once the skeleton has enough domain, topology, and tool-family signal."
    trigger: "When preparing a draft skeleton for exemplar comparison or citing representative IWC workflows."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use corpus-grounded collection pattern guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for collection cleanup, reshaping, relabeling, identifier synchronization, or collection-tabular bridges."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use corpus-grounded tabular pattern guidance for unresolved skeleton steps."
    trigger: "When adding TODO steps for tabular filtering, projection, joins, aggregation, text-processing recipes, or tabular-collection bridges."
related_notes:
  - "[[cwl-summary-to-galaxy-interface]]"
  - "[[cwl-summary-to-galaxy-data-flow]]"
---
# cwl-summary-to-galaxy-template

Read the original CWL source artifact, the CWL summary, the CWL-to-Galaxy interface brief, and the CWL-to-Galaxy data-flow brief. Emit a gxformat2 skeleton with workflow inputs, workflow outputs, placeholder steps, rough connections, and TODO slots for later implementation Molds.

CWL already carries structured workflow shape, so this Mold should be lighter than [[nextflow-summary-to-galaxy-template]]. Treat the prior-step index as the working context: CWL source, CWL summary, interface brief, data-flow brief, and any open questions carried forward.

---
type: mold
name: author-galaxy-tool-wrapper
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 2
ai_generated: true
related_notes:
  - "[[nextflow-patterns]]"
  - "[[summary-nextflow]]"
summary: "Author a new Galaxy tool wrapper (XML) when discovery yields nothing acceptable."
references:
  - kind: schema
    ref: "content/schemas/summary-nextflow.schema.json"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Read process tool, container, conda, inputs, outputs, script summary, and test fixture evidence from the source pipeline summary."
  - kind: research
    ref: "[[galaxy-xsd]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Use Galaxy's upstream XML schema as the contract for wrapper elements, parameters, outputs, tests, assertions, and metadata blocks."
    trigger: "When selecting or validating Galaxy tool XML syntax for a new wrapper."
  - kind: research
    ref: "[[component-nextflow-containers-and-envs]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Map Nextflow container/conda evidence to Galaxy tool requirements and wrapper provenance."
    trigger: "When a missing Galaxy wrapper must be authored from a Nextflow process with container or conda directives."
    verification: "Author one wrapper from nf-core/bacass or nf-core/rnaseq process evidence and confirm the note improves requirements/container extraction."
---
# author-galaxy-tool-wrapper

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

---
type: mold
name: validate-galaxy-step
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-02
revision: 2
ai_generated: true
summary: "Run gxwf validation on the just-implemented Galaxy step and route failures back to step implementation."
references:
  - kind: cli-command
    ref: "[[gxwf validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate a partial gxformat2 workflow while implementing one Galaxy step at a time."
    trigger: "After a Galaxy step is implemented or modified inside the per-step loop."
    verification: "Run the cast skill on an IWC-derived partial workflow and confirm gxwf diagnostics route back to the failing step."
  - kind: research
    ref: "[[galaxy-tool-job-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Keep static step validation findings distinct from wrapper-defined runtime failure semantics."
    trigger: "When a selected tool can validate structurally but may fail at runtime due to stdio rules, exit-code handling, dynamic outputs, or datatype behavior."
---

# validate-galaxy-step

Validate the Galaxy workflow fragment after one step has been implemented. The Mold owns the inline validation loop: run [[gxwf validate]], classify diagnostics that are local to the new step, and route failures back to [[implement-galaxy-tool-step]] or [[author-galaxy-tool-wrapper]] as appropriate.

This is separate from [[validate-galaxy-workflow]] because the harness behavior differs: step validation runs inside the per-step loop and should preserve local context about the step that just changed.

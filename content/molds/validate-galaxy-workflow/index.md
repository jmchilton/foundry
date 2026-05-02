---
type: mold
name: validate-galaxy-workflow
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures."
references:
  - kind: cli-command
    ref: "[[gxwf validate]]"
    used_at: runtime
    load: on-demand
    mode: sidecar
    evidence: hypothesis
    purpose: "Validate the assembled gxformat2 workflow before runtime testing."
    trigger: "After all Galaxy steps and workflow tests have been assembled."
    verification: "Run the cast skill on a complete IWC-derived workflow and confirm terminal validation findings are separated from runtime test failures."
---

# validate-galaxy-workflow

Validate the assembled Galaxy workflow before runtime testing. The Mold owns the terminal validation pass: run `[[gxwf validate]]`, classify workflow-level diagnostics, and route failures back to the responsible authoring phase when possible.

This is separate from `[[validate-galaxy-step]]` because terminal validation no longer has only one fresh step in scope and should reason over cross-step workflow structure.

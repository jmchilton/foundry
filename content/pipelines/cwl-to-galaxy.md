---
type: pipeline
title: CWL → GALAXY
tags:
  - pipeline
  - source/cwl
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Path from a CWL Workflow to a Galaxy gxformat2 workflow. Lighter upstream extraction."
phases:
  - mold: "[[summarize-cwl]]"
  - mold: "[[summary-to-galaxy-data-flow]]"
  - mold: "[[summary-to-galaxy-template]]"
  - mold: "[[compare-against-iwc-exemplar]]"
  - branch: discover-or-author
    loop: true
    branches:
      - "[[discover-shed-tool]]"
      - fallthrough: "[[author-galaxy-tool-wrapper]]"
  - mold: "[[summarize-galaxy-tool]]"
    loop: true
  - mold: "[[implement-galaxy-tool-step]]"
    loop: true
  - mold: "[[validate-galaxy-step]]"
    loop: true
  - mold: "[[cwl-test-to-galaxy-test-plan]]"
  - mold: "[[implement-galaxy-workflow-test]]"
  - mold: "[[validate-galaxy-workflow]]"
  - mold: "[[run-workflow-test]]"
  - mold: "[[debug-galaxy-workflow-output]]"
---

# CWL → GALAXY

Direct path. Lifted from `docs/HARNESS_PIPELINES.md` §"CWL → GALAXY".

CWL is already structured, so the upstream `summarize-cwl → summary-to-galaxy-data-flow` step is much lighter than its `summarize-paper` or `summarize-nextflow` counterparts. The per-step Galaxy authoring tier downstream is identical to the other Galaxy-targeting pipelines.

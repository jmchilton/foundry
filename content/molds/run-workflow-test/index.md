---
type: mold
name: run-workflow-test
axis: generic
tags:
  - mold
status: draft
created: 2026-04-30
revised: 2026-05-02
revision: 2
ai_generated: true
summary: "Execute a workflow's tests via Planemo; emit structured pass/fail and outputs."
references:
  - kind: research
    ref: "[[planemo-asserts-idioms]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Interpret assertion failures and choose the right fast inner-loop command before full reruns."
    trigger: "When a workflow test file exists and the task is to run, iterate, or classify its test assertions."
  - kind: research
    ref: "[[planemo-workflow-test-architecture]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Run workflow tests while preserving Planemo structured artifacts, Galaxy mode, invocation id, history id, and API follow-up context."
    trigger: "When choosing between managed Galaxy, external Galaxy, full test runs, existing invocation checks, or direct workflow runs."
  - kind: research
    ref: "[[galaxy-workflow-invocation-failure-reference]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Preserve invocation identifiers and state summaries needed to inspect workflow-level runtime failures after Planemo returns."
    trigger: "When Planemo reports a failed, cancelled, missing-output, or ambiguous workflow invocation result."
---
# run-workflow-test

Stub. Replace with real Mold content per MOLD_SPEC once first walks are done.

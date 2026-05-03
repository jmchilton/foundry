---
type: mold
name: cwl-test-to-galaxy-test-plan
axis: source-specific
source: cwl
tags:
  - mold
  - source/cwl
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 2
ai_generated: true
summary: "Translate CWL test fixtures into a Galaxy workflow test plan."
---
# cwl-test-to-galaxy-test-plan

Translate CWL test fixtures, job inputs, expected outputs, and assertion evidence into a Galaxy workflow test plan. The output is a reviewable handoff, not a concrete `tests-format` file; [[implement-galaxy-workflow-test]] owns final YAML authoring and static validation.

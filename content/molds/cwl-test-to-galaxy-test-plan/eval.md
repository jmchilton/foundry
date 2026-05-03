# cwl-test-to-galaxy-test-plan eval

## Case: schema-valid translated test plan

- check: deterministic
- fixture: CWL workflow with job input object, expected outputs, secondary files, and collection-like array inputs.
- expectation: emits a Galaxy workflow test plan that validates against the handoff schema selected for Galaxy workflow tests.

## Case: plan-not-final-tests boundary

- check: llm-judged
- fixture: cast skill output for a representative CWL workflow summary and test fixture.
- expectation: output describes a Galaxy workflow test plan, not concrete test details that belong only in the Galaxy `tests-format` schema. Every test description carries provenance and evidence for its inputs, expected outputs, assertion intent, tolerances, and omissions.

## Case: workflow-aware compatibility

- check: deterministic
- fixture: translated Galaxy workflow test plan plus matching draft Galaxy workflow skeleton when available.
- expectation: plan records the workflow labels, collections, and datatypes it depends on when a draft workflow is available, or records unresolved mapping assumptions when evaluating from the CWL summary alone.

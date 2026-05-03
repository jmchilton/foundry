# nextflow-test-to-cwl-test-plan eval

## Case: plan-not-final-tests boundary

- check: llm-judged
- fixture: cast skill output for an nf-core/demo or nf-core/bacass Nextflow summary.
- expectation: output describes a CWL workflow test plan, not concrete CWL job files or final assertion artifacts. Every test description carries provenance and evidence for its inputs, expected outputs, assertion intent, tolerances, and omissions.

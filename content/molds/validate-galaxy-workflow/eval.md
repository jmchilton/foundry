# validate-galaxy-workflow eval

## Case: complete valid workflow

- check: deterministic
- fixture: complete gxformat2 workflow expected to pass gxwf validation.
- expectation: reports a clean validation result and allows the harness to proceed to `[[run-workflow-test]]`.

## Case: cross-step workflow error

- check: llm-judged
- fixture: complete gxformat2 workflow with a workflow-level connection or output problem.
- expectation: classifies the failure as terminal workflow validation, identifies the likely responsible phase, and does not treat it as a Planemo runtime failure.

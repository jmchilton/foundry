# validate-galaxy-workflow eval

## Case: complete valid workflow

- check: deterministic
- fixture: complete gxformat2 workflow expected to pass gxwf validation.
- expectation: reports a clean validation result and allows the harness to proceed to [[run-workflow-test]].

## Case: cross-step workflow error

- check: llm-judged
- fixture: complete gxformat2 workflow with a workflow-level connection or output problem.
- expectation: classifies the failure as terminal workflow validation, identifies the likely responsible phase, and does not treat it as a Planemo runtime failure.

## Case: validation versus runtime boundary

- check: llm-judged
- fixture: gxformat2 workflow that passes static validation but still has a plausible runtime failure risk, such as missing tool runtime behavior, optional output assumptions, or collection element mismatch.
- expectation: records why static validation is insufficient and names the runtime artifact that should prove or disprove the risk, such as invocation messages, job details, output collections, or Planemo structured test output.

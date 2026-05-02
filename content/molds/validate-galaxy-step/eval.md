# validate-galaxy-step eval

## Case: missing step input mapping

- check: deterministic
- fixture: partial gxformat2 workflow with a newly added step missing an input connection.
- expectation: runs gxwf validation, identifies the failure as local to the new step, and routes back to step implementation.

## Case: wrapper-level mismatch

- check: llm-judged
- fixture: partial workflow where a selected Tool Shed wrapper lacks an expected parameter.
- expectation: distinguishes fix-in-step from re-summarize/re-author wrapper work and explains the recommended loop target.

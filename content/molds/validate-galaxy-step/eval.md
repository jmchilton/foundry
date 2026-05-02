# validate-galaxy-step eval

## Case: missing step input mapping

- check: deterministic
- fixture: partial gxformat2 workflow with a newly added step missing an input connection.
- expectation: runs gxwf validation, identifies the failure as local to the new step, and routes back to step implementation.

## Case: wrapper-level mismatch

- check: llm-judged
- fixture: partial workflow where a selected Tool Shed wrapper lacks an expected parameter.
- expectation: distinguishes fix-in-step from re-summarize/re-author wrapper work and explains the recommended loop target.

## Case: tool failure semantics visibility

- check: llm-judged
- fixture: partial workflow step whose selected wrapper has non-default failure detection, such as explicit stdio regexes, exit-code ranges, or strict-shell behavior.
- expectation: records whether static step validation can see the relevant tool failure semantics and what job API fields must be inspected if the step later fails at runtime.

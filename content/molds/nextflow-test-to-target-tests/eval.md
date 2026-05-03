# nextflow-test-to-target-tests eval

## Case: schema-valid translated test plan

- check: deterministic
- fixture: nf-core/bacass or minimal demo Nextflow summary containing nf-test profiles, params, input fixtures, expected outputs, and snapshot evidence.
- expectation: emits a target test plan that validates against the handoff schema selected for Galaxy workflow tests.

## Case: workflow cross-check compatibility

- check: deterministic
- fixture: translated Galaxy workflow test plan plus matching draft Galaxy workflow skeleton.
- expectation: `checkTestsAgainstWorkflow` reports zero missing input labels, zero missing output labels, and no collection or datatype shape mismatches introduced by the translation.

## Case: Planemo-runnable assertions

- check: deterministic
- fixture: translated tests materialized as Galaxy workflow tests for the demo or bacass cast.
- expectation: Planemo can load the tests and run or lint them far enough to prove the assertions are syntactically valid for Galaxy workflow testing.

## Case: nf-test snapshot fidelity

- check: llm-judged
- fixture: nf-test snapshot evidence covering outputs such as `succeeded_task_count`, `versions.yml`, stable named files, and directory outputs with ignore globs.
- expectation: translated Planemo assertions exercise the same output intent using suitable assertions such as `has_text`, `has_n_lines`, `has_size`, stable-name checks, or tolerated omissions for intentionally unstable files.

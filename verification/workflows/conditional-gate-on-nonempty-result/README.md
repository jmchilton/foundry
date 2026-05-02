# Conditional gate on non-empty result

This verification exercises `[[conditional-gate-on-nonempty-result]]` with a tiny Galaxy workflow that computes whether an input collection is non-empty, then gates downstream marker steps with `when:`.

Candidate 3 is the passing workflow. It uses the MGnify-style `collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file -> when` chain because the shorter routes failed.

Record failed candidates here with one-line reproduction notes. The committed workflow file should contain only the winning shape.

## Candidate notes

- Candidate 1, direct `when` over the connected collection input, failed under `uvx planemo test gate-on-nonempty-candidate1.gxwf.yml --galaxy_branch release_25.1`: the non-empty case reached workflow scheduling but failed with `FailureReason.when_not_boolean` and `Type is: HistoryDatasetAssociation`.
- Candidate 2, embedded CWL `ExpressionTool` producing a boolean from `File[]`, failed before Galaxy startup: gxformat2 0.21.0 validates embedded `run:` blocks as `GalaxyWorkflow` and rejects `class: ExpressionTool`.
- Candidate 3, MGnify-style shim, passed two Planemo tests under Galaxy `release_25.1`. The false-path test asserts a dataset produced by `$(!inputs.when)` because Planemo does not expose a `false` workflow parameter output in test `results`.
- Planemo 0.75.41 recognizes `.gxwf.yml` plus `.gxwf-test.yml` for workflow tests; `.gxformat2.yml` plus `-tests.yml` produced `No tests were executed` locally.

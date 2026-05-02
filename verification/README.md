# Verified workflows

This tree holds small, checked-in Galaxy workflows used to verify Foundry pattern claims.

Each workflow is intentionally narrow: it should exercise one pattern operation end to end and keep all inputs plus expected outputs in-tree when they are byte-scale.

## Layout

Verified workflows live under `verification/workflows/<slug>/`.

Each workflow directory should contain:

- `README.md` explaining what is verified and why this workflow shape was chosen.
- One workflow file, usually `.gxwf.yml`.
- One Planemo workflow test file.
- `test-data/` with tiny inputs and expected baselines.

The matching Foundry note lives under `content/verification/` and links the workflow back to the pattern it verifies.

## Local runs

From a workflow directory, run Planemo directly:

```sh
planemo lint *.gxwf.yml
planemo test *.gxwf.yml --galaxy_branch release_25.1
```

Use the exact workflow filename once a directory has more than one experimental file. Planemo 0.75.41 recognizes `.gxwf.yml` plus `.gxwf-test.yml` for these fixtures.

## Eligibility

A verified workflow should be committed only when it is deterministic, small, and explains what claim it verifies.

Prefer in-tree test data for tiny fixtures. Do not use Zenodo or remote fixtures for byte-scale inputs.

This v1 surface deliberately avoids generators, RO-Crate metadata, Dockstore wiring, scheduled Galaxy-version matrices, and IWC-style sharding.

See `docs/VERIFIED_WORKFLOWS_PLAN.md` for the implementation plan.

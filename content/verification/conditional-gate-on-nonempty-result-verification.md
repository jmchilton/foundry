---
type: verification
title: "Verification: conditional gate on non-empty result"
tags:
  - verification
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Planemo-verified Galaxy workflow for deriving a boolean from a non-empty collection and gating a step."
target: galaxy
workflow_path: verification/workflows/conditional-gate-on-nonempty-result/gate-on-nonempty.gxwf.yml
verification_status: passing
verifies_pattern: "[[conditional-gate-on-nonempty-result]]"
---

# Verification: conditional gate on non-empty result

This verification tests [[conditional-gate-on-nonempty-result]] against Galaxy `release_25.1` with Planemo.

The passing workflow uses the MGnify-style collection shim:

```text
collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file -> when
```

Two shorter candidates were tried first and rejected. A direct `when` over the collection failed because Galaxy required a boolean, not a dataset. An embedded CWL `ExpressionTool` shim failed gxformat2 validation before Galaxy startup.

The checked workflow verifies both sides of the gate:

- a one-element collection computes `true` and runs `gated_marker`;
- an empty collection computes `false` and runs a false-path marker because Planemo does not expose `false` parameter outputs in workflow `results` for direct assertion.

Local command:

```sh
uvx planemo test "gate-on-nonempty.gxwf.yml" --galaxy_branch release_25.1 --test_output_json "candidate3-test-output.json" --test_output "candidate3-test-output.html" --summary minimal
```

Run from `verification/workflows/conditional-gate-on-nonempty-result/`.

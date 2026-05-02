---
type: pattern
pattern_kind: leaf
title: "Conditional: gate on non-empty result"
aliases:
  - "gate on nonempty result"
  - "skip reporting on empty output"
  - "data-derived when gate"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Derive a boolean from empty or non-empty data, then use when to skip reporting or export steps."
related_notes:
  - "[[iwc-conditionals-survey]]"
related_patterns:
  - "[[conditional-run-optional-step]]"
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[collection-cleanup-after-mapover-failure]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
---

# Conditional: gate on non-empty result

## Tool

Use a Galaxy `when:` gate whose boolean input is computed from upstream data shape or content.

The corpus-backed collection recipe is:

```text
collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file -> when
```

MGnify proves this shape in IWC, but it is clunky: four shim steps to produce one boolean. Treat it as verified precedent and fallback evidence, not as the final preferred authoring target.

A shorter route might be possible with a Galaxy-native `when` expression or a smaller expression-tool boolean shim, but that needs validation in a small verified-pattern workflow before it becomes the lead recommendation.

## When to reach for it

Use this when downstream reporting, visualization, or export should run only if an upstream dataset or collection has content.

Common shape:

1. Upstream step may produce an empty result.
2. Workflow computes a boolean from that result.
3. Boolean is connected as an input named `when`.
4. Downstream reporting/conversion steps declare `when: $(inputs.when)`.

This is not a generic user toggle. If the user chooses whether to run an optional branch, use [[conditional-run-optional-step]].

This is not map-over cleanup. If the need is to drop empty or failed elements inside a collection before the next collection consumer, use [[collection-cleanup-after-mapover-failure]].

This is not `__FILTER_NULL__`. The conditionals survey found zero `__FILTER_NULL__` usage in `$IWC_FORMAT2`, but zero uptake alone is not an anti-pattern call.

## Operation Boundary

This pattern covers data-derived branch admission:

- input fact: "this result is empty/non-empty";
- output action: "run or skip downstream steps";
- gate mechanism: boolean-producing shim connected to Galaxy `when`.

It does not cover routing between mutually exclusive alternatives and merging with `pick_value`, optional transform then pass-through fallback, filtering collection members, or nullable conditional outputs.

## Parameters

Authoring-relevant fields:

- gated step input: `id: when`, with source from the boolean-producing step or subworkflow output;
- gated step body: `when: $(inputs.when)`;
- collection boolean shim: count identifiers and convert `count != 0` to boolean;
- text-like dataset content shim: map empty text to `false` and non-empty text to `true`.

Observed MGnify collection recipe:

```text
collection_element_identifiers
  -> wc_gnu
  -> column_maker with c1 != 0
  -> param_value_from_file
  -> gated Krona / BIOM export steps
```

This is corpus-backed but intentionally not pretty. Prefer it only when no shorter verified recipe is available.

## Idiomatic Shapes

Conceptual gated reporting step:

```yaml
in:
  - id: input
    source: upstream_result
  - id: when
    source: nonempty_boolean/output_param_boolean
when: $(inputs.when)
```

Conceptual collection-to-boolean shim:

```text
collection -> collection_element_identifiers -> wc_gnu -> column_maker(c1 != 0) -> param_value_from_file
```

Conceptual text-like dataset-content shim:

```text
dataset -> param_value_from_file -> map_param_value(empty string = false, non-empty default = true)
```

These snippets are summaries of observed IWC shapes. Do not simplify the MGnify chain in a generated workflow until the shorter route validates.

## Pitfalls

- Do not lead with the MGnify four-step shim as "best" just because it is corpus-backed. It proves the operation; it may not be the ideal generated-workflow recipe.
- Do not invent a shorter `when` expression without validation. Galaxy workflow syntax and tool-form roundtripping need a verified-pattern fixture first.
- Do not use this when the choice is user-controlled. Direct boolean `when` gates are simpler.
- Do not replace collection cleanup with a workflow gate. Cleanup changes collection members; this pattern skips whole downstream steps.
- Do not cite `__FILTER_NULL__` as an IWC-backed conditional pattern. Survey found no corpus uptake.

## Exemplars (IWC)

- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1358-1483` — embedded subworkflow labeled `Map empty/not empty collection to boolean`; uses `collection_element_identifiers -> wc_gnu -> column_maker -> param_value_from_file`.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1330-1357` — boolean gates Krona output generation.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mgnify-amplicon-pipeline-v5-rrna-prediction/mgnify-amplicon-pipeline-v5-rrna-prediction.gxwf.yml:1484-1659` — same boolean gates BIOM conversion/export steps.
- `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3057-3218`, `$IWC_FORMAT2/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.gxwf.yml:3289-3346` — text-like dataset-content variant: telomere BED text is mapped to a boolean before gating Pretext graph steps.

## Verification TODO

Add a small verified-pattern workflow for this operation. Test whether a shorter Galaxy-native `when` expression or expression-tool boolean shim validates and roundtrips cleanly.

If it works, make the shorter verified route the lead recommendation and keep the MGnify recipe as corpus-observed fallback evidence. If it fails, keep the MGnify route as the known-good corpus-backed recipe despite the clunkiness.

Issue: <https://github.com/jmchilton/foundry/issues/84>.

## See Also

- [[iwc-conditionals-survey]] — Candidate C decision record and verification TODO.
- [[galaxy-conditionals-patterns]] — conditionals MOC.
- [[conditional-run-optional-step]] — primitive `when:` branch for user booleans.
- [[conditional-route-between-alternative-outputs]] — route alternatives and merge with `pick_value`.
- [[collection-cleanup-after-mapover-failure]] — use when empty/failed collection elements should be dropped or replaced, not when whole downstream steps should be skipped.

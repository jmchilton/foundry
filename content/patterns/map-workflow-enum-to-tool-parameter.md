---
type: pattern
pattern_kind: leaf
evidence: corpus-and-verified
title: "Parameter: map workflow enum to tool parameter"
aliases:
  - "map_param_value"
  - "enum-to-tool-dialect mapping"
  - "workflow enum normalization"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 2
ai_generated: true
summary: "Use map_param_value to translate workflow enum values into downstream tool codes, flags, or snippets."
related_notes:
  - "[[iwc-parameter-derivation-survey]]"
related_patterns:
  - "[[conditional-route-between-alternative-outputs]]"
  - "[[conditional-run-optional-step]]"
  - "[[compose-runtime-text-parameter]]"
  - "[[tabular-compute-new-column]]"
  - "[[tabular-split-taxonomy-string]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
verification_paths:
  - verification/workflows/map-workflow-enum-to-tool-parameter/map-enum-to-text.gxwf-test.yml
---

# Parameter: map workflow enum to tool parameter

## Tool

Use `toolshed.g2.bx.psu.edu/repos/iuc/map_param_value/map_param_value/0.2.0` when a workflow input uses a human-facing enum or label, but downstream tools require exact codes, flags, snippets, or naming fragments.

The corpus-backed shape is:

```text
workflow enum/string -> map_param_value -> downstream tool parameter
```

## When to reach for it

Use this when one logical workflow option must feed multiple downstream tools with different parameter vocabularies.

Good fits include strandedness codes, tool flags, suffix abbreviations, and snippets selected from an enum.

Do not use this page for `when` gate booleans. If the mapped output controls branch topology, use [[conditional-route-between-alternative-outputs]] or [[conditional-run-optional-step]].

Do not use this for arithmetic or row-wise computation; use tabular patterns such as [[tabular-compute-new-column]].

If the mapped value becomes one component inside a larger expression string, this page covers the enum-to-fragment step; [[compose-runtime-text-parameter]] covers the concatenation.

## Operation Boundary

This pattern covers parameter dialect normalization:

- input fact: a workflow-facing value is readable to users;
- output action: a downstream tool receives the exact dialect it expects;
- mapping mechanism: `map_param_value`.

It does not cover enum-to-boolean route selection, direct optional gates, tabular row computation, or runtime string assembly from multiple pieces.

## Parameters

- `input_param_type.type`: usually `text` for enum/string values.
- `input_param_type.input_param`: connected upstream workflow value.
- `input_param_type.mappings`: list of `{from, to}` pairs.
- `output_param_type`: usually `text` for tool dialects and snippets.
- `unmapped.on_unmapped`: prefer `fail` for closed enums and exact downstream dialects.

`on_unmapped: input` can intentionally pass through labels, but it can also leak a human-facing label into a strict tool parameter. Use it only when passthrough is deliberate.

## Idiomatic Shapes

RNA-seq strandedness mapped to `featureCounts` codes:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/map_param_value/map_param_value/0.2.0
in:
  - id: input_param_type|input_param
    source: Strandedness
out:
  - id: output_param_text
    hide: true
tool_state:
  input_param_type:
    type: text
    input_param:
      __class__: ConnectedValue
    mappings:
      - from: stranded - forward
        to: "1"
      - from: stranded - reverse
        to: "2"
      - from: unstranded
        to: "0"
  output_param_type: text
  unmapped:
    on_unmapped: fail
```

The same workflow enum maps through sibling `map_param_value` steps into Cufflinks library types and StringTie flags. Keep those as separate mapper steps because the downstream dialects are incompatible.

## Pitfalls

- Do not duplicate enum comparisons inside every downstream tool. Normalize once with `map_param_value`, then connect the resulting typed parameter.
- Do not use this page as the main reference for booleans that feed `when`; that is conditional routing.
- Do not drop empty string mappings as missing. StringTie maps `unstranded` to `""`, which is meaningful.
- Do not silently change quoted numeric codes into numeric output types unless the downstream parameter expects a numeric type.
- Do not use one mapper output for incompatible tool dialects. One workflow value may need several mapper steps.
- Treat long generated snippets as brittle. The taxonomy awk examples prove the mechanism, but a clearer wrapper or smaller expression is easier to maintain when available.

## Exemplars (IWC)

- `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:270-299` — `Strandedness` to `featureCounts` codes `1`, `2`, `0` with `unmapped.on_unmapped: fail`.
- `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:303-332` — same workflow enum mapped to Cufflinks library types `fr-secondstrand`, `fr-firststrand`, `fr-unstranded`.
- `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:336-365` — same workflow enum mapped to StringTie flags `--fr`, `--rf`, and empty string.
- `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1017-1081`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1082-1140`, `$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:1141-1152` — mapped outputs connected into `featureCounts`, StringTie, and Cufflinks parameters.
- `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:276-313`, `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:1497-1522` — haplotype labels mapped to suffix abbreviations, then consumed by `compose_text_param`.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.gxwf.yml:35-72`, `$IWC_FORMAT2/amplicon/amplicon-mgnify/taxonomic-rank-abundance-summary-table/taxonomic-rank-abundance-summary-table.gxwf.yml:118-139` — taxonomic rank mapped to awk program text and connected as `tp_awk_tool.code`.

## See Also

- [[iwc-parameter-derivation-survey]] — Candidate D decision record.
- [[conditional-route-between-alternative-outputs]] — boundary for enum/boolean mapping used to select graph branches.
- [[conditional-run-optional-step]] — boundary for simple `when` gating.
- [[compose-runtime-text-parameter]] — when mapped fragments must be assembled into a larger string.
- [[tabular-compute-new-column]] — row-wise computation in dataset-land.

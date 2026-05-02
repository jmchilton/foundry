---
type: pattern
pattern_kind: leaf
evidence: corpus-observed
title: "Tabular: concatenate collection to table"
aliases:
  - "collection-to-single-tabular-with-collapse_dataset"
  - "collapse_dataset collection to tabular"
  - "collection-to-tabular bridge"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Use collapse_dataset to row-bind a collection of tabulars into one table, with optional element IDs and header dedupe."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[tabular-pivot-collection-to-wide]]"
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-group-and-aggregate-with-datamash]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
---

# Tabular: concatenate collection to table

## Tool

`toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset/5.1.0`. The tabular survey found 44 step instances, making this the dominant collection-to-tabular bridge for row-binding per-element tabular outputs into one dataset.

## When to reach for it

Use this when a Galaxy dataset collection of tabular-like files must become one tabular dataset for downstream `Cut1`, `Filter1`, `datamash_ops`, `tp_find_and_replace`, or reporting steps.

Do not use this for plain two-file concatenation; use `tp_cat` or legacy `cat1` only when the input is not a collection. Do not use this when each collection element should become a column; use [[tabular-pivot-collection-to-wide]]. For grouped collapse within one table, use [[tabular-group-and-aggregate-with-datamash]].

## Parameters

- `input_list`: connected collection input.
- `filename.add_name`: whether to inject the collection element identifier into output rows.
- `filename.place_name`: where/how to place the element identifier when `add_name: true`.
- `one_header`: whether to keep only one header row across all collection elements.

The canonical headered-table shape is:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/nml/collapse_collections/collapse_dataset/5.1.0
tool_state:
  filename:
    add_name: true
    place_name: same_multiple
  input_list: { __class__: ConnectedValue }
  one_header: true
```

## Idiomatic shapes

Per-sample tabulars to one annotated table:

```yaml
tool_state:
  filename:
    add_name: true
    place_name: same_multiple
  input_list: { __class__: ConnectedValue }
  one_header: true
```

Cited at `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:414-433`.

Collection concat with no element identifier:

```yaml
tool_state:
  filename:
    add_name: false
  input_list: { __class__: ConnectedValue }
  one_header: false
```

Cited at `$IWC_FORMAT2/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:178-198`.

Headerless outputs with row provenance:

```yaml
tool_state:
  filename:
    add_name: true
    place_name: same_multiple
  input_list: { __class__: ConnectedValue }
  one_header: false
```

Cited at `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:715-734`.

## Pitfalls

- **`add_name: false` loses provenance.** This is silent if downstream needs sample or element identity.
- **`one_header: false` duplicates headers** when each collection element has its own header row.
- **`one_header: true` on headerless data may drop a real first row.** Only enable it when inputs have headers.
- **`place_name: same_multiple` is the row-provenance idiom.** It repeats the element name so each output row carries identity.
- **`same_once` is a different shape.** Use it only when downstream expects block labels, not per-row identity.
- **This is row-bind, not wide pivot.** If each collection element should become a column, use [[tabular-pivot-collection-to-wide]].

## Exemplars (IWC)

- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:414-433` — canonical triad: `add_name: true`, `place_name: same_multiple`, `one_header: true`.
- `$IWC_FORMAT2/amplicon/amplicon-mgnify/mapseq-to-ampvis2/mapseq-to-ampvis2.gxwf.yml:178-198` — concat without name/header handling: `add_name: false`, `one_header: false`.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:715-734` — `add_name: true`, `same_multiple`, `one_header: false`.
- `$IWC_FORMAT2/virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping.gxwf.yml:1195-1240` — repeated bridge pattern before tabular filtering.
- `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:509-548` — collection bridge in a pathogen workflow.

## Legacy alternative

For non-collection two-file concatenation, older workflows may use `tp_cat` or legacy core `cat1`. Those are not replacements for this pattern because they do not carry collection element identity.

## See also

- [[iwc-tabular-operations-survey]] — candidate 9 evidence.
- [[iwc-transformations-survey]] — collection-side cross-reference for the same bridge.
- [[tabular-pivot-collection-to-wide]] — collection elements become columns instead of rows.
- [[tabular-cut-and-reorder-columns]] — common cleanup after concatenation.

---
type: pattern
title: "Tabular: cut and reorder columns"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Use Cut1 with a comma-separated cN list to project — and reorder — columns. Listing out of order is the canonical reorder idiom."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[tabular-compute-new-column]]"
  - "[[tabular-sql-query]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
---

# Tabular: cut and reorder columns

## Tool

`Cut1` (Galaxy core; bundled, no toolshed owner). Display name "Cut columns from a table".

## When to reach for it

Project a tabular to a subset of columns, **and/or** reorder existing columns. By far the most-used tabular tool in the IWC corpus (127 step occurrences in the survey). Use `Cut1` when the operation is purely "pick columns" — no computation, no row filtering, no aggregation.

For project + compute fused, see [[tabular-sql-query]] or [[tabular-compute-new-column]].

## Parameters

- `columnList`: a single comma-separated string of `cN` references — e.g. `c4,c6,c7`. **Order matters**: the output column order is the list order, so listing columns out of input order *reorders* them.
- `delimiter`: enum; `T` for tab (the dominant value across the corpus), `C` for comma, `Sp` for space, `Dt` for dot, `U` for underscore, `Pi` for pipe. Default `T`.
- The connected `input` port is the tabular dataset.

## Idiomatic shapes

Pure projection (preserve order, drop unwanted columns):

```yaml
tool_id: Cut1
tool_state:
  columnList: c1,c2,c5
  delimiter: T
```

Projection + reorder in one step (note `c20` placed *after* `c26,c24,c25`):

```yaml
tool_id: Cut1
tool_state:
  columnList: c4,c6,c7,c13,c14,c15,c16,c17,c18,c19,c21,c22,c23,c26,c24,c25,c20
  delimiter: T
```

Cited at `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:782`.

## Pitfalls

- **No range syntax.** `c4-c10` is not parsed; expand the list explicitly. The corpus uses long enumerations, not ranges.
- **Header row is preserved.** `Cut1` operates per-line and doesn't special-case headers; if the input has a header, columns under the same `cN` indices in the header are reordered alongside the data, which is the desired behavior.
- **`delimiter` must match the input.** If the input is comma-separated and `delimiter: T` is used (the default), the whole row is treated as one column and the cut returns the first column or empty results.
- **Reorder-then-rename** is *not* `Cut1`'s job. Renaming columns means rewriting the header row — handle that with [[tabular-compute-new-column]] or with a `tp_replace_in_line` pass.
- **Adding a constant column** belongs to [[tabular-compute-new-column]] (`column_maker/Add_a_column1`), not `Cut1` + `Paste1`. The latter is legacy.

## Exemplars (IWC)

All paths relative to `<iwc-format2>/`:

- `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:782` — long projection + reorder (17 columns, `c20` last).
- `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:830`, `:878` — sibling Cut1 steps in the same workflow, different column lists.
- `genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences.gxwf.yml:733` — `Paste1`+`Cut1` chain (legacy idiom; prefer [[tabular-compute-new-column]] today).

## Legacy alternative

None for `Cut1` itself — it is the modern tool. The legacy *idiom* of "add a constant column with `Paste1` then re-`Cut1`" survives but should be replaced by `column_maker/Add_a_column1` (see [[tabular-compute-new-column]]).

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and decision record.
- [[tabular-compute-new-column]] — when projection needs to add or replace a column.
- [[tabular-sql-query]] — project + compute fused via `query_tabular`.

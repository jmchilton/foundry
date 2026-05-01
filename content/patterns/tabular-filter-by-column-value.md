---
type: pattern
title: "Tabular: filter rows by column value"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Use Filter1 with a Python expression over cN columns to drop rows. Highest-frequency tabular row filter in IWC."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[tabular-filter-by-regex]]"
  - "[[tabular-sql-query]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
---

# Tabular: filter rows by column value

## Tool

`Filter1` (Galaxy core; bundled, no toolshed owner). Display name "Filter data on any column using simple expressions".

## When to reach for it

One-shot row filter on tabular input. The row predicate is a single Python expression over `c1, c2, …` column references; the output preserves column order and types. By far the most common row-filter idiom in IWC (33 step occurrences in the surveyed corpus, second only to regex grep variants).

If the predicate needs join/sort/grouping semantics, switch to [[tabular-sql-query]] or to `datamash_ops`. If the predicate is a substring/regex over a single column or whole line, prefer [[tabular-filter-by-regex]].

## Parameters

- `cond`: any Python expression that returns truthy/falsy, with column references `c1, c2, …` (1-indexed). Comparison and boolean operators are the common case; arithmetic, `in` / `not in`, and function calls (e.g. `len`) also work. Quote string literals.
- `header_lines`: integer-as-string. **Set to `"1"` whenever the input has a header row.** Filter1 evaluates `cond` per row and silently drops rows whose evaluation raises (e.g. when a header row coerces badly under a numeric comparison); leaving `header_lines: "0"` on a headered input often produces a silent off-by-one.
- The connected `input` port is the tabular dataset.

## Idiomatic shapes

Single-column equality, header-aware:

```yaml
tool_id: Filter1
tool_state:
  cond: c4=='PASS' or c4=='.'
  header_lines: '1'
```

Cited at `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:545`.

Predicate produced upstream and wired in via `ConnectedValue` (lets a workflow author parameterize the predicate without a runtime parameter). Note that this corpus example has `header_lines: "0"` because the upstream rule already accounts for the header — the `header_lines` setting is independent of the `cond` source:

```yaml
tool_id: Filter1
tool_state:
  cond: { __class__: ConnectedValue }   # from a prior "generate filter rule" step
  header_lines: '0'
```

Cited at `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:320-336`.

## Pitfalls

- **Forgetting `header_lines`.** Default `"0"`. With a header row present, the header is evaluated like any other row; rows whose evaluation raises (typical on a header under a numeric comparison) are silently dropped, while a string-comparison header may pass through. Either way, off-by-one assertions downstream.
- **String quoting.** `cond: c4==PASS` parses as a name lookup on `PASS`, not a string comparison. Always quote literal strings.
- **No new columns.** `Filter1` is a *filter*; new or computed columns belong in [[tabular-compute-new-column]].
- **Implicit column-type coercion.** `cN` values are strings until an operator forces int/float; coercion failures drop the row silently. If silent drops are unacceptable, pre-clean upstream or use [[tabular-sql-query]].

## Exemplars (IWC)

All paths relative to `<iwc-format2>/`:

- `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:545` — literal predicate `c4=='PASS' or c4=='.'`, `header_lines: "1"`.
- `sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:276` — `ConnectedValue` predicate, `header_lines: "0"` (rule generated upstream).
- `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun.gxwf.yml:320-336` — `ConnectedValue` predicate, `header_lines: "0"`.

All three corpus filters are equality / disjunction over a string column, or a `ConnectedValue` rule. Numeric-range predicates are unattested — if you reach for `cN > X`, you're slightly off the corpus path; verify behavior on a sample.

## Legacy alternative

None — `Filter1` is the modern tool. (Don't confuse with `__FILTER_FROM_FILE__` and `__FILTER_EMPTY_DATASETS__`, which are collection-level filters, not tabular row filters.)

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and decision record.
- [[tabular-filter-by-regex]] — regex / line-pattern row filter.
- [[tabular-sql-query]] — when SQL semantics (joins, windows) are the right reach.

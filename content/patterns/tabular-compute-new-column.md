---
type: pattern
title: "Tabular: compute a new column"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-04-30
revision: 1
ai_generated: true
summary: "Use column_maker (Add_a_column1) with strict error_handling to insert/replace a computed column. Per-expression-kind auto_col_types rule."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[tabular-cut-and-reorder-columns]]"
  - "[[tabular-sql-query]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
---

# Tabular: compute a new column

## Tool

`toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1` ("Compute on rows", historically "Add a column"). 93 step occurrences in the surveyed IWC corpus — the canonical computed-column tool.

## When to reach for it

Insert, replace, or append a column whose value is a Python expression over the existing `cN` columns. Multiple expressions can be sequenced inside a single tool step (each one operates on the running output of the previous). Use this for arithmetic, simple type coercion, and string concatenation.

If the row decision needs a multi-line conditional or `split`/`gsub`, prefer awk (see the awk recipe sub-pages cross-referenced from [[iwc-tabular-operations-survey]]). If columns and a row predicate are computed together, prefer [[tabular-sql-query]].

## Parameters

- `expressions`: a list of `{ cond: <python-expr>, add_column: { mode: I | R | "" }, … }` entries, evaluated in order. `mode: I` inserts at a position, `R` replaces, `""` appends.
- `error_handling` (object) — **always set as below**:

  ```yaml
  error_handling:
    auto_col_types: <see table>
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  ```

  Both `fail_on_non_existent_columns: true` and `non_computable.action: --fail-on-non-computable` are uniform across the corpus (51/51 instances surveyed); turning either off makes failures silent.

## The strict `auto_col_types` rule

`auto_col_types` controls whether `cN` references are coerced to numeric when the expression demands it. The corpus shows a clean per-expression-kind split:

| Expression kind | `auto_col_types` |
|---|---|
| Arithmetic (`+`, `*`, `round()`, `int()`, …) on numeric columns | `true` |
| Pure string concatenation (`c5 + '>' + c6`) | `false` |
| Mixed | split into two `expressions:` entries with different settings |

Rationale: with `true`, `c5 + c6` performs numeric addition (silently turning a string concat into `0+0` if columns are non-numeric); with `false`, `c18 + c19` is string concat, which silently produces `"3.13.4"` instead of `6.4`. Both bugs are silent.

Canonical pair to memorize:

- Arithmetic, `auto_col_types: true` — `variation-reporting.gxwf.yml:316-329` (`AF = round((c18 + c19) / c6, 6)`, replace mode at position 7; `AFcaller` insert at position 8).
- String concat, `auto_col_types: false` — `variation-reporting.gxwf.yml:454-477` (`c5 + '>' + c6` named `change`, `c3 + ':' + c19` named `change_with_pos`).

## Idiomatic shapes

Insert + replace in one step, arithmetic:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: true
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  expressions:
    - cond: c7
      add_column:
        mode: I        # insert
        pos: '8'
      new_column_name: AFcaller
    - cond: round((c18 + c19) / c6, 6)
      add_column:
        mode: R        # replace
        pos: '7'
      new_column_name: AF
```

Cited at `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:316-329`.

String-concat new column, `auto_col_types: false`:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: false
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  expressions:
    - cond: c5 + '>' + c6
      new_column_name: change
    - cond: c3 + ':' + c19
      new_column_name: change_with_pos
```

Cited at `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:454-477`.

## Pitfalls

- **Wrong `auto_col_types`.** See the table above — the failure mode is silent and downstream-only.
- **Mixing arithmetic and string concat in one entry.** Split into two `expressions:` entries with different `auto_col_types` settings rather than reaching for `str(...)` casts inside the expression.
- **Skipping `error_handling`.** The defaults are not the corpus defaults; non-existent columns and non-computable rows pass through silently.
- **`add_column.mode`.** `I` (insert) and `R` (replace) take a 1-indexed `pos`; appending (`mode: ""`) goes at the end. Off-by-one in `pos` shifts every downstream cN reference.
- **`Add a column` (`addValue/1.0.1`)** — a different, legacy tool that adds a *constant* column only. Do not confuse with `column_maker/Add_a_column1`.

## Exemplars (IWC)

All paths relative to `<iwc-format2>/`:

- `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:316-329` — arithmetic, `auto_col_types: true`, insert + replace pair.
- `sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:454-477` — string concat, `auto_col_types: false`.
- `sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:344` — first occurrence in corpus.

## Legacy alternative

`toolshed.g2.bx.psu.edu/repos/devteam/add_value/addValue/1.0.1` ("Add a column", 56 step occurrences) is the legacy constant-column-only tool — heavily used in older VGP workflows. For new work, prefer `column_maker/Add_a_column1` even for constant columns; it carries the same `error_handling` story and unifies one tool.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey, §7 decision record for the `auto_col_types` rule.
- [[tabular-cut-and-reorder-columns]] — pure column projection without computation.
- [[tabular-sql-query]] — when project + compute + filter need to fuse.

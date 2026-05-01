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

The tool's `tool_state` has two top-level fields that matter for authoring: `error_handling` (sibling of `ops`, *not* nested inside it) and `ops` (which contains `header_lines_select` and `expressions`). Authors who flatten `expressions:` to the top level produce YAML that won't roundtrip.

- `error_handling` — **set as below**:

  ```yaml
  error_handling:
    auto_col_types: <see table>
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable   # or --skip-non-computable, see below
  ```

  `fail_on_non_existent_columns: true` is uniform across all 51 corpus instances. `non_computable.action: --fail-on-non-computable` is the dominant choice (49/51); the two `--skip-non-computable` instances both live in `consensus-from-variation.gxwf.yml` (`:364`, `:402`) where coordinate-arithmetic on BED rows can legitimately yield non-numeric inputs and skipping is intentional.

- `ops.header_lines_select`: `yes` if the input has a header row, `no` otherwise. The `yes` setting tells the tool to pass the first line through untouched.

- `ops.expressions`: list of `{ cond: <python-expr>, add_column: { mode: I | R | "" , pos: "<n>" }, new_column_name: <str> }` entries, evaluated in order. `mode: I` inserts at `pos`, `R` replaces at `pos`, `""` (with `pos: ""`) appends. `pos` is a quoted-numeric string, 1-indexed (corpus-inferred; not independently verified against tool source).

## The strict `auto_col_types` rule

`auto_col_types` controls whether bare `cN` references are coerced to numeric when the expression demands it. Corpus distribution is 48 `true` / 3 `false`. Pick by what the expression does to its `cN` references:

| Expression kind | `auto_col_types` |
|---|---|
| Arithmetic on raw `cN` (`(c18 + c19) / c6`, `round(...)`) | `true` |
| Pure string concatenation (`c5 + '>' + c6`) | `false` |
| Arithmetic with explicit casts (`int(c2) - …`, `float(cN)`) — the expression handles its own type coercion | `false` |
| Mixed | split into two `expressions:` entries with different settings |

Rationale: with `true`, `c5 + c6` performs numeric addition (silently turning a string concat into `0+0` if columns are non-numeric); with `false` and *no* explicit cast, `c18 + c19` is string concat, which silently produces `"3.13.4"` instead of `6.4`. Both bugs are silent. Explicit `int()` / `float()` is the third escape hatch.

Canonical exemplars to memorize:

- Arithmetic on raw `cN`, `auto_col_types: true` — `variation-reporting.gxwf.yml:316-329` (`AF = round((c18 + c19) / c6, 6)` replace at position 7; `AFcaller` insert at position 8).
- String concat, `auto_col_types: false` — `variation-reporting.gxwf.yml:438-475` (`c5 + '>' + c6` named `change`, `c3 + ':' + c19` named `change_with_pos`; both `mode: ""` append).
- Explicit-cast arithmetic, `auto_col_types: false` — `consensus-from-variation.gxwf.yml:343-378` (`int(c2) - (len(c3) == 1)` and `int(c2) + ((len(c3) - 1) or 1)`, replace at positions 2 and 3; uses `--skip-non-computable`).

## Idiomatic shapes

Insert + replace in one step, arithmetic on raw `cN`:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: true
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  ops:
    header_lines_select: yes
    expressions:
      - cond: c7
        add_column:
          mode: I        # insert
          pos: "8"
        new_column_name: AFcaller
      - cond: round((c18 + c19) / c6, 6)
        add_column:
          mode: R        # replace
          pos: "7"
        new_column_name: AF
```

Cited at `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:307-329`.

String-concat new columns (append), `auto_col_types: false`:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/devteam/column_maker/Add_a_column1/2.1
tool_state:
  error_handling:
    auto_col_types: false
    fail_on_non_existent_columns: true
    non_computable:
      action: --fail-on-non-computable
  ops:
    header_lines_select: yes
    expressions:
      - cond: c5 + '>' + c6
        add_column:
          mode: ""
          pos: ""
        new_column_name: change
      - cond: c3 + ':' + c19
        add_column:
          mode: ""
          pos: ""
        new_column_name: change_with_pos
```

Cited at `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:438-475`.

## Pitfalls

- **Wrong `auto_col_types`.** See the table above — the failure mode is silent and downstream-only.
- **Flattening `expressions:` to `tool_state` top level.** The actual nesting is `tool_state.ops.expressions` with `tool_state.ops.header_lines_select` as a sibling. `error_handling` is a sibling of `ops`, *not* nested inside it. Flat shapes don't roundtrip.
- **Mixing arithmetic and string concat in one entry.** Split into two `expressions:` entries with different `auto_col_types` rather than reaching for `str(...)` inside the expression.
- **Skipping `error_handling`.** The defaults are not the corpus defaults; non-existent columns and non-computable rows pass through silently.
- **`add_column.mode` / `pos`.** `I` (insert) and `R` (replace) take a quoted 1-indexed `pos`; append uses `mode: ""` and `pos: ""`. Off-by-one in `pos` shifts every downstream `cN` reference in subsequent expressions.
- **`Add a column` (`addValue/1.0.1`)** — a different, legacy tool that adds a *constant* column only. Do not confuse with `column_maker/Add_a_column1`.

## Exemplars (IWC)


- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:307-329` — raw-`cN` arithmetic, `auto_col_types: true`, insert + replace pair.
- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:438-475` — string concat, `auto_col_types: false`, append (`mode: ""`).
- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation.gxwf.yml:343-378` — explicit-cast arithmetic (`int(c2) - …`), `auto_col_types: false`, `--skip-non-computable`. Counter-example to "arithmetic always implies `auto_col_types: true`."

## Legacy alternative

`toolshed.g2.bx.psu.edu/repos/devteam/add_value/addValue/1.0.1` ("Add a column", 56 step occurrences) is the legacy constant-column-only tool — heavily used in older VGP workflows. For new work, prefer `column_maker/Add_a_column1` even for constant columns; it carries the same `error_handling` story and unifies one tool.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey, §7 decision record for the `auto_col_types` rule.
- [[tabular-cut-and-reorder-columns]] — pure column projection without computation.
- [[tabular-sql-query]] — when project + compute + filter need to fuse.

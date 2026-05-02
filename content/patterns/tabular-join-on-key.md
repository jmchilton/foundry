---
type: pattern
pattern_kind: leaf
title: "Tabular: join on key"
tags:
  - pattern
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-02
revision: 1
ai_generated: true
summary: "Use tp_easyjoin_tool for two-tabular key joins; use tp_multijoin_tool for many files and query_tabular for SQL joins."
related_notes:
  - "[[iwc-tabular-operations-survey]]"
related_patterns:
  - "[[tabular-group-and-aggregate-with-datamash]]"
  - "[[tabular-sql-query]]"
  - "[[tabular-pivot-collection-to-wide]]"
related_molds:
  - "[[implement-galaxy-tool-step]]"
---

# Tabular: join on key

## Tool

`toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_easyjoin_tool` is the primary corpus path for ordinary two-file key joins. Use `tp_multijoin_tool` when many files share the same key/value shape. Use [[tabular-sql-query]] when the join condition, projection, anti-join, named columns, or indexes are the point.

## When to reach for it

Use this pattern when two or more tabular datasets share an identifier column and need row-wise alignment.

Do not use this for collection-to-wide pivots; that is [[tabular-pivot-collection-to-wide]]. Do not use it for side-by-side paste with no key, row-bind/concat, or grouping. For aggregation around a join, see [[tabular-group-and-aggregate-with-datamash]].

## Parameters

For `tp_easyjoin_tool`:

- `column1`: 1-indexed key column in `infile1`, quoted as a string.
- `column2`: 1-indexed key column in `infile2`, quoted as a string.
- `empty_string_filler`: fill value for missing-side cells. Corpus values include `"0"` and `"."`.
- `header`: boolean; whether inputs have headers.
- `ignore_case`: boolean key matching option.
- `jointype`: join mode. Corpus default outer-style shape uses a literal single-space string: `" "`.
- `infile1`, `infile2`: connected tabular inputs.

For `tp_multijoin_tool`:

- `first_file`: first connected tabular input.
- `files`: remaining connected tabular inputs.
- `key_column`: shared key column.
- `value_columns`: value columns to carry through from each file.
- `filler`: fill value for missing cells.
- `input_header`, `output_header`: independent header toggles.
- `ignore_dups`: duplicate-key behavior.

## Idiomatic shapes

Two-file key join, fill missing with zero:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_easyjoin_tool/9.3+galaxy1
tool_state:
  column1: "20"
  column2: "1"
  empty_string_filler: "0"
  header: true
  ignore_case: false
  infile1: { __class__: ConnectedValue }
  infile2: { __class__: ConnectedValue }
  jointype: " "
```

Cited at `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:601-627`.

Many two-column files joined by a shared key:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/bgruening/text_processing/tp_multijoin_tool/9.3+galaxy1
tool_state:
  first_file: { __class__: ConnectedValue }
  files: { __class__: ConnectedValue }
  key_column: "1"
  value_columns: "2"
  filler: "0"
  input_header: false
  output_header: true
  ignore_dups: false
```

Cited at `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:796-819`.

SQL join when SQL semantics matter:

```yaml
tool_id: toolshed.g2.bx.psu.edu/repos/iuc/query_tabular/query_tabular/3.3.2
tool_state:
  query_result:
    header: yes
    header_prefix: ""
  sqlquery: |-
    SELECT pep.mpep, prot.prot
    FROM pep
    INNER JOIN prot on pep.mpep=prot.pep
  tables:
    - table: { __class__: ConnectedValue }
      tbl_opts:
        table_name: pep
        col_names: mpep
    - table: { __class__: ConnectedValue }
      tbl_opts:
        table_name: prot
        col_names: pep,prot
```

Cited at `$IWC_FORMAT2/proteomics/clinicalmp/clinicalmp-verification/clinicalmp-verification.gxwf.yml:359-415`.

## Pitfalls

- **`jointype: " "` is intentional.** The surveyed easyjoin shape uses a literal single-space string. Do not clean it up to an empty string or `--outer` without wrapper verification.
- **Key columns are 1-indexed strings.** Use `"1"`, `"20"`, etc. Do not use `c1` here.
- **Header flag must match input.** Wrong `header` settings shift matching and can duplicate or garble headers.
- **Fill value is semantic.** `"0"` means absent is zero; `"."` means absent is unknown/missing. Pick based on downstream interpretation.
- **`tp_easyjoin_tool` is not SQL.** Compound predicates, anti-joins, named-column projection, or indexed joins belong in [[tabular-sql-query]].
- **`tp_multijoin_tool` assumes uniform shape.** It fits many same-shaped key/value files, not arbitrary heterogeneous tables.
- **Do not substitute collection joins.** `collection_column_join` is for the collection-to-wide-table idiom, not ordinary two-file joins.

## Exemplars (IWC)

- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:601-627` — canonical `tp_easyjoin_tool` with `column1: "20"`, `column2: "1"`, `empty_string_filler: "0"`, `header: true`, `jointype: " "`.
- `$IWC_FORMAT2/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml:722-747`, `:752-777`, `:799-825` — repeated fan-in joins with the same easyjoin shape.
- `$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:3452-3477` — newer `tp_easyjoin_tool/9.5+galaxy3`, key `1` to `1`, filler `"."`.
- `$IWC_FORMAT2/microbiome/metagenomic-genes-catalogue/metagenomic-genes-catalogue.gxwf.yml:1013-1041` — headerless easyjoin, labeled "Join Prodigal to AMR".
- `$IWC_FORMAT2/microbiome/pathogen-identification/pathogen-detection-pathogfair-samples-aggregation-and-visualisation/Pathogen-Detection-PathoGFAIR-Samples-Aggregation-and-Visualisation.gxwf.yml:796-819` — `tp_multijoin_tool`, key column `"1"`, value column `"2"`, filler `"0"`.
- `$IWC_FORMAT2/proteomics/clinicalmp/clinicalmp-verification/clinicalmp-verification.gxwf.yml:359-415` — `query_tabular` `INNER JOIN`.
- `$IWC_FORMAT2/proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow.gxwf.yml:724-814` — SQL anti-join using `WHERE ... NOT IN (SELECT ... JOIN ...)`.

## Legacy alternative

Older core join tools may appear in inherited workflows, but the tabular survey's recommended path is `tp_easyjoin_tool` for ordinary two-file joins and `tp_multijoin_tool` for many same-shaped files. Preserve legacy steps when reading old workflows; do not introduce them in new authoring.

## See also

- [[iwc-tabular-operations-survey]] — corpus survey and candidate 6 evidence.
- [[tabular-sql-query]] — SQL joins and anti-joins.
- [[tabular-group-and-aggregate-with-datamash]] — grouped summaries before/after joins.
- [[tabular-pivot-collection-to-wide]] — collection of two-column tables to wide table.

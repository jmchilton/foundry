---
type: research
subtype: component
title: "gxformat2 workflow inputs"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
related_notes:
  - "[[gxformat2-schema]]"
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-datatypes-conf]]"
  - "[[galaxy-workflow-testability-design]]"
sources:
  - "/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications/schema/v19_09/workflow.yml"
  - "/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications/schema/v19_09/Process.yml"
  - "/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications/gxformat2/normalized/_conversion.py"
  - "/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications/gxformat2/normalized/_format2.py"
  - "/Users/jxc755/projects/repositories/galaxy/lib/galaxy/workflow/modules.py"
  - "/Users/jxc755/projects/repositories/galaxy/lib/galaxy/workflow/workflow_parameter_input_definitions.py"
summary: "Conceptual model, current aliases, corpus attestation, and schema annotation gaps for gxformat2 workflow inputs."
---

# gxformat2 workflow inputs

Use this note when translating or authoring the top-level `inputs:` section of a gxformat2 workflow. [[gxformat2-schema]] gives the closed vocabulary, but not the authoring posture: which aliases are current, which fields drive Galaxy runtime behavior, and which schema gaps should be annotated upstream.

## Conceptual model

A gxformat2 workflow input is a top-level workflow interface item. Galaxy imports it as one of three native input step families:

| gxformat2 type | Native Galaxy step | Meaning | Authoring guidance |
|---|---|---|---|
| `data`, `File` | `data_input` | One Galaxy dataset input. | Prefer `data`. Treat `File` as CWL-friendly alias accepted for compatibility. |
| `collection` | `data_collection_input` | One Galaxy dataset collection input. | Pair with `collection_type`; if absent, Galaxy defaults to `list`. |
| `string`, `int`, `float`, `boolean` | `parameter_input` | Scalar workflow parameter exposed at invocation. | Prefer current gxformat2 spellings: `string`, `int`, `float`, `boolean`. |
| `[<scalar-type>]` | `parameter_input` with `multiple: true` in native state | Multiple primitive values. | Supported by conversion code, but absent from the IWC corpus surveyed here. |

The current conversion code makes the alias split explicit. Native Galaxy stores parameter inputs as `text` and `integer` (`workflow_parameter_input_definitions.py:15`; `modules.py:1277-1285`), but gxformat2 normalized export converts them to `string` and `int` (`_conversion.py:376-392`). Import accepts both spellings and converts `string -> text`, `int -> integer` for native state (`_conversion.py:1149-1165`).

## Current vs compatibility aliases

Author new gxformat2 with the current normalized export vocabulary:

| Use in new gxformat2 | Also accepted | Evidence |
|---|---|---|
| `data` | `File`, `data_input` | SALAD documents `File` as a `data` alias (`workflow.yml:40-45`); normalization maps `File` and `data_input` to `data` (`_format2.py:314-319`). |
| `collection` | `data_collection`, `data_collection_input` | Native input steps are not gxformat2 steps; SALAD says native input step types should be represented under `inputs` (`workflow.yml:55-62`); normalization maps native aliases to `collection` (`_format2.py:314-319`). |
| `string` | `text` | SALAD says `text` aliases `string` because Galaxy tools use `text` (`workflow.yml:40-42`, `workflow.yml:205-222`); export emits `string` (`_conversion.py:386-389`). |
| `int` | `integer` | SALAD says `integer` aliases `int` because Galaxy tools use `integer` (`workflow.yml:40-42`, `workflow.yml:165-183`); export emits `int` (`_conversion.py:386-389`). |
| `float` | `double`, maybe `long` in generated structural schema | Galaxy parameter inputs currently expose only `float`, not `double` or `long` (`workflow_parameter_input_definitions.py:15`; `modules.py:1277-1285`). |
| `boolean` | none meaningful | Native and gxformat2 agree. |

The generated structural JSON Schema includes `null`, `long`, `double`, `integer`, `text`, and `File` because it flattens primitive/SALAD vocabulary (`gxformat2.schema.json:650-690`). That enum is permissive vocabulary, not a current-authoring recommendation.

## Corpus attestation

Survey: 120 generated IWC gxformat2 workflows under `$IWC_FORMAT2`, produced by `make fixtures-iwc fixtures-skeletons` on 2026-05-05. The survey counted 677 workflow inputs.

| Type | Count | Notes |
|---|---:|---|
| `string` | 179 | Current gxformat2 text parameter spelling. |
| `data` | 170 | Current dataset spelling. |
| `int` | 142 | Current gxformat2 integer parameter spelling. |
| `collection` | 107 | Current collection spelling; 75 `list`, 32 `list:paired`. |
| `boolean` | 44 | Current boolean spelling. |
| `float` | 35 | Current numeric decimal spelling. |

Not observed in the generated IWC format2 corpus: `text`, `integer`, `File`, `long`, `double`, `null`, array-valued input types.

Examples:

- VGP Scaffolding uses `type: string`, `type: data`, `type: collection`, `type: boolean`, and `type: int` in one interface (`$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:5-63`).
- RNA-seq paired-end uses `collection_type: list:paired`, optional string adapters, `restrictOnConnections`, data inputs, restrictions, and booleans (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:5-64`).
- Viral variant calling shows optional dataset input with no default and required numeric parameters with defaults (`$IWC_FORMAT2/virology/generic-non-segmented-viral-variant-calling/pe-illumina-simple-virus-calling-and-consensus.gxwf.yml:28-46`).

## Cross-cut fields

### `optional` and `default`

`optional` controls whether Galaxy requires the workflow input at invocation. It defaults to `false` in SALAD (`workflow.yml:64-76`) and in native modules (`modules.py:1028-1086`, `modules.py:1263-1272`). `default` is inherited from the CWL-ish `InputParameter` base and is applied when the input object is missing or `null` (`Process.yml:40-55`).

Runtime behavior differs by input family:

- Dataset and collection inputs read `default` only when no invocation value is supplied; the default is converted through `raw_to_galaxy` (`modules.py:1039-1049`).
- Parameter inputs read `default` when no invocation value is supplied; non-dict defaults are wrapped as `{value: <default>}` before extracting the value (`modules.py:1717-1732`).
- The Galaxy parameter-input editor carries a backwards-compatibility conditional around defaults, but the code comment says defaults can now be set for optional and required parameters (`modules.py:1336-1342`).

Corpus shape:

| Shape | Count |
|---|---:|
| required, no default | 520 |
| required, default | 67 |
| optional, default | 84 |
| optional, no default | 46 |

Guidance: do not infer `optional: true` merely because `default` exists. IWC has required parameters with defaults, especially thresholds and numeric settings. Use `optional: true` when omission is semantically acceptable; use `default` when Galaxy should supply a value if the user omits or nulls the input.

### `format`

`format` applies to dataset and collection inputs. Galaxy uses it as datatype-extension filtering for valid datasets (`workflow.yml:78-89`; `modules.py:1006-1018`, `modules.py:1140-1157`, `modules.py:1202-1222`). In the generated IWC corpus it appears on 112 inputs. Frequent values include `fasta` (28), `fastqsanger.gz` (21), `tabular` (15), `fastqsanger` (14), `fastq` (10), and `bam` (9). Valid extension vocabulary should cite [[galaxy-datatypes-conf]].

### `collection_type`

`collection_type` applies to `type: collection`. SALAD documents default `list` and colon-separated nested types (`workflow.yml:130-139`, `workflow.yml:269-278`). The IWC format2 corpus attests only `list` (75) and `list:paired` (32), but [[galaxy-collection-semantics]] is the broader authority for valid Galaxy collection shapes.

### `restrictions`, `suggestions`, and `restrictOnConnections`

These fields are current Galaxy behavior but are not declared in the SALAD input records or the generated JSON Schema.

`restrictions` is a static closed option list for text inputs. Galaxy turns a text parameter with restrictions into a select input at runtime (`modules.py:1627-1638`). IWC attests 25 restricted string inputs, e.g. the VGP `Haplotype` input (`$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:29-39`) and RNA-seq `Strandedness` (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:51-58`).

`suggestions` is a static open suggestion list for text inputs. Galaxy passes suggestions as options without switching the parameter type to select (`modules.py:1649-1655`). IWC attests one suggestion list, the minimap preset input in assembly polishing (`$IWC_FORMAT2/genome-assembly/polish-with-long-reads/Assembly-polishing-with-long-reads.gxwf.yml:17-24`).

`restrictOnConnections` asks Galaxy to derive a text input's valid choices from connected tool/subworkflow select options at runtime (`modules.py:1522-1609`). IWC attests 76 uses, such as VGP Busco lineage inputs (`$IWC_FORMAT2/VGP-assembly-v2/Scaffolding-HiC-VGP8/Scaffolding-HiC-VGP8.gxwf.yml:68-89`) and RNA-seq reference genome (`$IWC_FORMAT2/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml:36-40`).

Option item shape is either a scalar value or an object with `value` and optional `label`; Galaxy converts both into runtime options (`modules.py:1610-1625`) and serializes colon-delimited editor state back into the source shape (`modules.py:1801-1884`).

### Input tags

Native Galaxy data and collection input modules expose a `tag` field used as a runtime input filter (`modules.py:1022-1026`, `modules.py:1079-1098`, `modules.py:1140-1157`, `modules.py:1202-1222`). The generated gxformat2 conversion currently does not copy `tag` from native input steps into top-level gxformat2 inputs (`_conversion.py:524-540`).

Corpus status: native cleaned IWC workflows have `tag` present on 266 data/collection input step states, but every value is empty string or null. No non-empty workflow-input tag filter was observed. Generated gxformat2 workflows still contain many unrelated tool-state `tag` and output `tags` fields, so searches for `tag:` in whole files are not evidence for top-level input tags.

Guidance: treat input `tag` as real native Galaxy behavior but not yet gxformat2 interface vocabulary. If gxformat2 should preserve it, add it deliberately to the SALAD data/collection input records and conversion key lists.

## Schema annotation proposals

The schema should answer authoring questions directly. Suggested SALAD-side changes:

1. Split accepted aliases from recommended spellings in `GalaxyType.doc`.

```yaml
- name: GalaxyType
  type: enum
  extends: sld:PrimitiveType
  symbols: [integer, text, File, data, collection]
  doc:
    - "Recommended gxformat2 authoring spellings are data, collection, string, int, float, and boolean."
    - "data: one Galaxy dataset input. Prefer this over File for new gxformat2."
    - "File: accepted alias for data for CWL compatibility; normalized gxformat2 export emits data."
    - "collection: one Galaxy dataset collection input; pair with collection_type."
    - "string: inherited primitive used for Galaxy text parameters in normalized gxformat2 export."
    - "text: accepted alias for string because native Galaxy tool/input state calls this text."
    - "int: inherited primitive used for Galaxy integer parameters in normalized gxformat2 export."
    - "integer: accepted alias for int because native Galaxy tool/input state calls this integer."
```

2. Add explicit docs to each concrete input class, not only to the catch-all.

```yaml
- name: WorkflowTextParameter
  doc: |
    A scalar text workflow parameter. New gxformat2 should use `type: string`;
    `type: text` is accepted for compatibility with native Galaxy parameter
    state and Galaxy tool XML terminology.

- name: WorkflowIntegerParameter
  doc: |
    A scalar integer workflow parameter. New gxformat2 should use `type: int`;
    `type: integer` is accepted for compatibility with native Galaxy parameter
    state and Galaxy tool XML terminology.
```

3. Add a Galaxy-specific default/optional note to `BaseInputParameter.optional` or `InputParameter.default`.

```yaml
doc: |
  If true, Galaxy allows invocation without a user-supplied value for this
  workflow input. This is independent of `default`: a required input may still
  have a default value, and an optional input may have no default. Galaxy applies
  `default` when the invocation input is missing or null.
```

4. Add text-option fields to `WorkflowTextParameter` and the catch-all `WorkflowInputParameter`.

```yaml
- name: WorkflowTextOption
  type: record
  fields:
    - name: value
      type: string
      doc: Machine value submitted to the connected tool input.
    - name: label
      type: string?
      doc: Human label shown in Galaxy; defaults to value when omitted.

- name: restrictions
  type:
    - "null"
    - type: array
      items:
        - string
        - WorkflowTextOption
  doc: |
    Closed set of permitted values for a text workflow parameter. Galaxy renders
    the runtime input as a select when this field is present.

- name: suggestions
  type:
    - "null"
    - type: array
      items:
        - string
        - WorkflowTextOption
  doc: |
    Open suggestion list for a text workflow parameter. Galaxy shows suggested
    options but still treats the input as text.

- name: restrictOnConnections
  type: boolean?
  doc: |
    Ask Galaxy to derive valid text choices from connected tool or subworkflow
    select inputs at runtime. If derivation fails, Galaxy falls back to free text.
```

5. Add `tag` only to data and collection input records if gxformat2 should preserve native runtime filtering.

```yaml
- name: tag
  type: string?
  doc: |
    Galaxy data-input tag filter. At invocation time Galaxy filters candidate
    datasets or dataset collections by this tag. Not observed with non-empty
    values in the IWC corpus surveyed on 2026-05-05.
```

6. Emit JSON Schema annotations from SALAD docs, or post-process generated JSON Schema.

The current generated JSON Schema preserves enum membership but drops the conceptual guidance and the extra text-option fields. If SALAD codegen cannot carry the full docs through, add JSON Schema extension annotations such as:

```json
{
  "x-galaxy-recommendedTypeSpellings": ["data", "collection", "string", "int", "float", "boolean"],
  "x-galaxy-compatibilityAliases": {
    "File": "data",
    "data_input": "data",
    "data_collection": "collection",
    "data_collection_input": "collection",
    "text": "string",
    "integer": "int"
  },
  "x-galaxy-corpusAttestedTypes": ["data", "collection", "string", "int", "float", "boolean"]
}
```

## Open questions

- Should `long` and `double` remain in generated structural JSON Schema if Galaxy native parameter inputs do not expose them?
- Should `color` and `directory_uri`, which Galaxy native parameter inputs expose, become gxformat2 input types or stay native-only?
- Should `tag` be added to gxformat2 inputs now, or deferred until a non-empty corpus example or user need appears?
- Should `restrictions`, `suggestions`, and `restrictOnConnections` be allowed only on `WorkflowTextParameter`, or also on catch-all `WorkflowInputParameter` for array-valued text parameters?

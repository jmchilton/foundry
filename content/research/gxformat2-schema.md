---
type: research
subtype: component
title: "gxformat2 structural JSON Schema"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-05
revised: 2026-05-05
revision: 1
ai_generated: true
related_notes:
  - "[[galaxy-collection-semantics]]"
  - "[[galaxy-datatypes-conf]]"
  - "[[galaxy-workflow-testability-design]]"
sources:
  - "https://github.com/jmchilton/galaxy-tool-util-ts/blob/7ae4ecd0ba8d492225f58a6d455c4cc5317298f0/packages/schema/src/galaxy-workflow.ts"
summary: "Vendored structural JSON Schema for gxformat2 workflows: vocabulary for inputs, outputs, steps, and step subtypes."
---

> **Vendored from upstream**, pinned at SHA `7ae4ecd`. One file lives next to this note:
>
> - `gxformat2.schema.json` — Draft-07 JSON Schema generated from the `@galaxy-tool-util/schema` Effect-TS schema via `gxwf structural-schema --format format2`. **Agents and casting should consume this** when validating gxformat2 workflows or reasoning about the closed vocabulary of input/step types.
>
> **Re-sync:** `pnpm sync:vendored --update`. Sync builds galaxy-tool-util-ts and re-runs the generator before copy.

## Top-level shape

A gxformat2 document is an object with required `inputs`, `outputs`, `class` (`enum: ["GalaxyWorkflow"]`), and `steps`. Optional: `id`, `label`, `doc`, `uuid`, `report`, `tags`, `comments`, `creator`, `license`, `release`.

## Workflow input vocabulary

Each entry under `inputs` carries:

- `type` — closed enum: `null | boolean | int | long | float | double | string | integer | text | File | data | collection`. Drives whether the input is a parameter, a single dataset, or a collection.
- `format` — Galaxy datatype extension when `type ∈ {File, data}`. See [[galaxy-datatypes-conf]] for valid values.
- `collection_type` — free-form string (e.g. `list`, `paired`, `list:paired`, `list:list`) when `type = collection`. Closed value set lives in [[galaxy-collection-semantics]], not in this schema.
- `optional` — boolean.
- `default` — opaque (`/schemas/unknown`); type-dependent.
- `label`, `doc`, `id`, `position` — metadata.

## Workflow step vocabulary

Each entry under `steps` (`WorkflowStepSchema`) carries `type` ∈ `{tool, subworkflow, pause, pick_value}`, plus `tool_id`, `tool_shed_repository`, `tool_version`, `in`, `out`, `state`, `tool_state`, `run`, `runtime_inputs`, `when`, `errors`, `uuid`, `label`, `doc`, `position`, `id`.

## Caveats

- **Doc strings dropped.** Effect-TS `JSONSchema.make` does not preserve description fields. Narrative grounding for what each input/step type means lives in this note and in upstream gxformat2 SALAD (`$GXFORMAT2/schema/v19_09/workflow.yml`).
- **Repeated `$id: "/schemas/unknown"` markers.** The `Schema.Unknown` placeholder for opaque values (such as `default`) emits a duplicate `$id` 15× in the gxformat2 schema. Strict Ajv refuses to compile; pass `{ strict: false }` or strip the duplicates before compile.
- **`collection_type` is not a closed enum.** The schema accepts any string; valid composite shapes are pinned in [[galaxy-collection-semantics]].

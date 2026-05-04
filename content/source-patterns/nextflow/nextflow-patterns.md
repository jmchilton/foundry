---
type: source-pattern
title: "Nextflow: source pattern map"
source: nextflow
target: galaxy
source_pattern_kind: moc
implemented_by_patterns:
  - "[[galaxy-collection-patterns]]"
  - "[[galaxy-conditionals-patterns]]"
  - "[[galaxy-tabular-patterns]]"
tags:
  - source-pattern
  - source/nextflow
  - target/galaxy
status: draft
created: 2026-05-03
revised: 2026-05-03
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-map-over-lifecycle-survey]]"
  - "[[nextflow-to-galaxy-channel-shape-mapping]]"
  - "[[nextflow-operators-to-galaxy-collection-recipes]]"
summary: "Use this source-pattern map to route recurring Nextflow channel and operator idioms to Galaxy implementation patterns."
---

# Nextflow: source pattern map

This is the source-facing map for Nextflow-to-Galaxy conversion patterns. Use it when the source evidence is a Nextflow channel shape or operator idiom rather than a Galaxy operation.

The Galaxy pattern library remains the implementation layer. Source-pattern pages should explain what the converter saw in Nextflow, then link to the Galaxy patterns that implement or approximate that source idiom.

## Intended operation or recipe pages

- **Samplesheet rows to Galaxy collections** — route `fromSamplesheet`, `splitCsv`, and repeated `tuple(meta, path)` inputs toward Galaxy `list`, `paired`, and `list:paired` collection construction.
- **Keyed joins to identifier synchronization** — route `join` and `combine(by:)` toward identifier extraction, filtering, sorting, and relabeling patterns.
- **Grouped channels to collection reshaping** — route `groupTuple`, `transpose`, and grouped tuple payloads toward nested collections, Apply Rules reshaping, flattening, or domain reduction.
- **Branches to filters or gates** — route `branch`, `.filter`, and `.ifEmpty` toward Galaxy filters, conditional gates, or review triggers.
- **Mix and collect to report aggregation** — route `mix`, `collect`, `toList`, and `collectFile` toward report aggregation, tabular collapse/pivot, and output bundles.

## Metadata contract

Each source-pattern page should list the Galaxy implementation pages in `implemented_by_patterns`. That field is machine-validated to resolve only to `type: pattern` notes.

Use `review_triggers` when the Nextflow idiom has semantics Galaxy cannot preserve automatically: unmatched join keys, duplicate keys, `remainder`, arbitrary tuple records, per-element dynamic branching, or filesystem-specific `publishDir` layout.

## See also

- [[iwc-map-over-lifecycle-survey]] — IWC map-over lifecycle survey that motivated this source-pattern layer.
- [[nextflow-to-galaxy-channel-shape-mapping]] — prior source-to-target shape mapping.
- [[nextflow-operators-to-galaxy-collection-recipes]] — prior operator classification.

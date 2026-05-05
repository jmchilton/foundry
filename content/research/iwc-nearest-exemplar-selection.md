---
type: research
subtype: component
title: "IWC nearest exemplar selection"
tags:
  - research/component
  - target/galaxy
status: draft
created: 2026-05-02
revised: 2026-05-03
revision: 2
ai_generated: true
related_notes:
  - "[[iwc-exemplar-runtime-discovery]]"
  - "[[galaxy-data-flow-draft-contract]]"
  - "[[iwc-transformations-survey]]"
  - "[[iwc-tabular-operations-survey]]"
  - "[[iwc-test-data-conventions]]"
related_molds:
  - "[[compare-against-iwc-exemplar]]"
  - "[[nextflow-summary-to-galaxy-template]]"
  - "[[cwl-summary-to-galaxy-template]]"
  - "[[paper-summary-to-galaxy-template]]"
sources:
  - "https://github.com/jmchilton/foundry/issues/55"
summary: "Defines a feature hierarchy for selecting useful IWC exemplar workflows for structural comparison."
---

# IWC Nearest Exemplar Selection

Use a feature hierarchy, not one global similarity score. “Nearest” means “best comparison target for the current authoring decision,” usually after a Galaxy template exists and before concrete per-step implementation.

## Feature Hierarchy

1. Domain or analysis intent.
2. Input collection topology.
3. Primary tool families.
4. DAG motifs and structural recipes.
5. Output types and report shape.
6. Test style and fixture topology.

Domain comes first so a structurally similar workflow in the wrong science area does not become a misleading exemplar. Topology comes second because collection shape is one of the most important Galaxy-specific design decisions. Test style is useful after a workflow match, but should not drive initial retrieval.

## Example Exemplar Anchors

| Scenario | Candidate exemplar | Why useful |
|---|---|---|
| Read QC and trimming | `$IWC_SKELETONS/read-preprocessing/short-read-qc-trimming/short-read-quality-control-and-trimming.gxwf.yml` | Minimal `list:paired` FASTQ, `fastp`, `MultiQC`, and simple QC topology. |
| Paired-end RNA-seq | `$IWC_SKELETONS/transcriptomics/rnaseq-pe/rnaseq-pe.gxwf.yml` | `list:paired` reads, align/count/report tool families, coverage/report branches, MultiQC aggregation. |
| SARS-CoV-2 VCF reporting | `$IWC_SKELETONS/sars-cov-2-variant-calling/sars-cov-2-variation-reporting/variation-reporting.gxwf.yml` | VCF collection handling, SnpSift filtering/extracting, tabular transforms, joins, plots, report outputs. |
| Metagenome-assembled genomes | `$IWC_SKELETONS/microbiome/mags-building/MAGs-generation.gxwf.yml` | Metagenomic `list:paired`, assembler/binning/refinement choices, collection building/flattening, report aggregation. |
| LC-MS metabolomics | `$IWC_SKELETONS/metabolomics/lcms-preprocessing/Mass_spectrometry__LC-MS_preprocessing_with_XCMS.gxwf.yml` | List of mzML-like inputs, XCMS/CAMERA preprocessing, sample metadata, matrix/report outputs. |

Use `$IWC_FORMAT2/...` for parameter-level evidence and exact `tool_state`. Use `$IWC_SKELETONS/...` for topology, labels, tool-family order, workflow inputs/outputs, and collection shapes.

## Citation Guidance

- Pair generated fixture citations with pinned upstream source URLs when the note makes a durable claim.
- Prefer `$IWC_SKELETONS` for structural comparison and `$IWC_FORMAT2` for exact parameter evidence.
- Cite upstream IWC source URLs pinned to fixture commit `deafc4876f2c778aaf075e48bd8e95f3604ccc92` when possible.
- Use tests only after selecting a likely workflow exemplar; tests are often conventions rather than workflow semantics.

## Confidence Levels

| Level | Meaning |
|---|---|
| High | Same domain/subdomain, same input topology, same primary tool families, same major DAG motifs, and matching test fixture shape. |
| Medium | Same domain and topology, but partial tool-family or output match. Useful exemplar, not canonical. |
| Low | Cross-domain structural match only. Useful for a pattern comparison, not a nearest domain exemplar. |
| No nearest exemplar | Candidate lacks domain or topology alignment, or only shares generic tools such as `MultiQC`. |

## Failure Modes

- Do not claim nearest from tool overlap alone. `MultiQC`, `fastp`, `Cut1`, `awk`, and `datamash` are too common.
- Do not rank cross-domain structural recipes above same-domain workflows unless explicitly comparing a pattern.
- Do not overfit exact tool versions.
- Do not use tests as the primary match driver.
- Avoid nearest-exemplar claims for off-corpus features such as composite data, unusual deep collections, negative tests, or tools absent from IWC.
- If multiple weak candidates tie, report no high-confidence nearest and compare against pattern exemplars instead.

## Mold Use

- [[compare-against-iwc-exemplar]] should use this as the selection procedure for finding and ranking exemplar candidates.
- The source-specific Galaxy template Molds ([[nextflow-summary-to-galaxy-template]], [[cwl-summary-to-galaxy-template]], [[paper-summary-to-galaxy-template]]) should use this on demand when a skeleton is mature enough to pick comparison targets.

## Runtime Discovery

The default runtime discovery mechanism is defined by [[iwc-exemplar-runtime-discovery]]: live IWC GitHub URLs for retrieval and provenance, with `gxwf` used to normalize selected workflows for structural comparison.

## TODOs

- Decide whether exemplar comparison should emit one nearest workflow or two to three ranked exemplars.
- Decide whether confidence should be a single label or a per-axis vector.
- Decide whether output schema should require source URL plus local fixture citation pairs.
- Specify the exact `gxwf` normalization command sequence once CLI manual pages cover it.

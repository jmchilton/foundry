---
type: research
subtype: design-spec
title: "IWC exemplar runtime discovery"
tags:
  - research/design-spec
  - target/galaxy
status: draft
created: 2026-05-03
revised: 2026-05-03
revision: 1
ai_generated: true
related_notes:
  - "[[iwc-nearest-exemplar-selection]]"
  - "[[galaxy-data-flow-draft-contract]]"
related_molds:
  - "[[compare-against-iwc-exemplar]]"
summary: "Resolves runtime IWC exemplar discovery through live IWC URLs plus gxwf processing."
---

# IWC Exemplar Runtime Discovery

## Decision

`compare-against-iwc-exemplar` discovers candidates at runtime from the live IWC GitHub tree, then uses `gxwf` to normalize fetched workflow files for structural comparison.

The v1 procedure is:

1. Load draft features from the data-flow/template handoff: domain intent, input topology, tool families, DAG motifs, output/report shape, and test hints.
2. Query the IWC GitHub tree or contents API under `https://github.com/galaxyproject/iwc/tree/main/workflows/` for candidate workflow paths.
3. Narrow candidates by path/domain keywords first, then by fetched workflow labels, input types, output labels, and tool ids.
4. Fetch only the ranked candidate workflows as URLs.
5. Normalize each fetched workflow with `gxwf` into the comparison representation needed by the Mold.
6. Rank with `[[iwc-nearest-exemplar-selection]]` and emit one nearest exemplar plus weak alternates when useful.

The caller may provide a local IWC path as an override for offline development, but cast artifacts must not depend on Foundry `workflow-fixtures/` or a bundled exemplar index.

## Rationale

This keeps IWC as a cited external corpus instead of a mirrored Foundry runtime dependency. It also avoids a pre-cast index that can drift from IWC before the generated skill runs.

`gxwf` is the normalizer, not the retriever of record. GitHub URLs remain the durable provenance surface; `gxwf` turns selected candidates into comparable structure after retrieval.

## Rejected Options

- Foundry-hosted pre-cast exemplar index: faster, but violates the URL-not-mirror posture and creates drift.
- Generated fixtures under `workflow-fixtures/`: useful for research evidence, not runtime cast artifacts.
- Mandatory user-supplied path: good fallback, but too manual for default harness behavior.
- Pure `gxwf` listing without IWC URL provenance: hides the corpus source and makes citation weaker.

## Open Work

- Specify the structural-diff JSON schema.
- Decide whether the output schema requires one nearest exemplar or a ranked list.
- Add CLI manual pages if the exact `gxwf` normalization commands become Mold references.

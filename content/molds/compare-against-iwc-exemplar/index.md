---
type: mold
name: compare-against-iwc-exemplar
axis: target-specific
target: galaxy
tags:
  - mold
  - target/galaxy
status: draft
created: 2026-04-30
revised: 2026-05-03
revision: 4
ai_generated: true
summary: "Find nearest IWC exemplar(s) and surface a structural diff against a draft."
input_artifacts:
  - id: galaxy-workflow-draft
    description: "gxformat2 skeleton from a *-summary-to-galaxy-template Mold; the draft compared against IWC exemplars."
output_artifacts:
  - id: iwc-comparison-notes
    kind: markdown
    default_filename: iwc-comparison-notes.md
    description: "Structural diff against the nearest IWC exemplar(s); guidance for authoring before more concrete step work."
references:
  - kind: research
    ref: "[[iwc-exemplar-runtime-discovery]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: hypothesis
    purpose: "Discover IWC exemplar candidates from live IWC GitHub URLs and normalize selected workflows with gxwf."
    verification: "Run exemplar discovery for nf-core/rnaseq, viralrecon, and mag cases and confirm selected candidates match eval expectations."
  - kind: research
    ref: "[[iwc-nearest-exemplar-selection]]"
    used_at: runtime
    load: upfront
    mode: verbatim
    evidence: corpus-observed
    purpose: "Rank IWC exemplar candidates by domain, collection topology, tool families, DAG motifs, outputs, and tests."
    trigger: "When selecting nearest IWC workflows for structural comparison against a Galaxy draft."
  - kind: research
    ref: "[[galaxy-data-flow-draft-contract]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: hypothesis
    purpose: "Compare against the draft's abstract intent without turning exemplar comparison into tool resolution."
    trigger: "When deciding whether to compare abstract data-flow, gxformat2 skeleton structure, or concrete implementation details."
    verification: "Promote after exemplar comparison flags structural issues without resolving concrete tool metadata."
  - kind: pattern
    ref: "[[galaxy-collection-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Compare draft collection transformations against curated corpus-observed pattern guidance."
    trigger: "When the draft workflow contains collection reshape, cleanup, relabel, synchronization, or collection-tabular bridge sections."
  - kind: pattern
    ref: "[[galaxy-tabular-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Compare draft tabular transformations against curated corpus-observed pattern guidance."
    trigger: "When the draft workflow contains tabular filtering, projection, join, aggregation, SQL, or free-form text-processing sections."
  - kind: research
    ref: "[[iwc-test-data-conventions]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Compare test-data placement and fixture shapes against IWC conventions."
    trigger: "When exemplar comparison includes workflow tests or input fixture organization."
  - kind: research
    ref: "[[iwc-shortcuts-anti-patterns]]"
    used_at: runtime
    load: on-demand
    mode: verbatim
    evidence: corpus-observed
    purpose: "Flag draft shortcuts that are accepted in IWC versus shortcuts that should be treated as smells."
    trigger: "When reviewing draft tests, assertions, labels, or expected-output comparisons."
---
# compare-against-iwc-exemplar

Find the nearest IWC exemplar workflow(s) for a Galaxy draft and emit a structural diff that can guide authoring before more effort is spent on concrete step implementation.

This Mold is the corpus-first check in Galaxy-targeting pipelines. It does not retrieve exemplars as a separate Mold; discovery, ranking, and comparison are one action. Runtime discovery uses live IWC GitHub URLs plus `gxwf` normalization per [[iwc-exemplar-runtime-discovery]], and ranking uses [[iwc-nearest-exemplar-selection]].

## Inputs

The Mold expects a Galaxy draft from one of the source-specific Galaxy template Molds ([[nextflow-summary-to-galaxy-template]], [[cwl-summary-to-galaxy-template]], [[paper-summary-to-galaxy-template]]) or a later implemented workflow. The draft should include:

- Workflow/domain intent and source summary context.
- Workflow inputs, outputs, and collection topology.
- Abstract or concrete step labels.
- Tool-family hints, even when exact Tool Shed wrappers are unresolved.
- Placeholder transformations such as collection cleanup, Apply Rules reshaping, tabular bridges, and optional branches.
- Test or fixture hints when available.

The caller may also provide:

- An IWC branch, tag, or commit SHA. Default is the live `main` branch.
- A local IWC checkout path for offline development. This is an override, not a cast dependency.
- A maximum candidate count for fetched workflows.

## Outputs

A structural comparison object conforming to the future structural-diff schema. Sketch shape:

```jsonc
{
  "query_features": {
    "domain": "transcriptomics/rna-seq",
    "input_topology": ["list:paired fastq"],
    "tool_families": ["fastp", "star", "featurecounts", "multiqc"],
    "dag_motifs": ["qc branch", "alignment branch", "report aggregation"],
    "outputs": ["counts table", "multiqc report"]
  },
  "nearest": {
    "path": "workflows/transcriptomics/rnaseq-pe/rnaseq-pe.ga",
    "url": "https://github.com/galaxyproject/iwc/.../rnaseq-pe.ga",
    "confidence": "high",
    "rationale": "same domain, paired FASTQ topology, align/count/report shape"
  },
  "alternates": [],
  "diff": {
    "aligned_patterns": [],
    "draft_missing": [],
    "draft_extra": [],
    "ordering_differences": [],
    "test_differences": [],
    "speculative_findings": []
  }
}
```

Confidence labels are the labels from [[iwc-nearest-exemplar-selection]]: `high`, `medium`, `low`, or `no nearest exemplar`.

## Procedure

### 1. Extract draft features

Read the draft at the abstraction level it currently supports. Do not force unresolved template TODOs into concrete tools.

Extract the feature hierarchy from [[iwc-nearest-exemplar-selection]]:

1. Domain or analysis intent.
2. Input collection topology.
3. Primary tool families.
4. DAG motifs and structural recipes.
5. Output types and report shape.
6. Test style and fixture topology.

Keep missing features explicit. A draft with no domain signal should not produce a high-confidence exemplar even if it shares generic tools.

### 2. Discover candidate IWC workflows

Use the IWC GitHub tree or contents API under `https://github.com/galaxyproject/iwc/tree/main/workflows/` to list candidate workflow paths. Start with path/domain narrowing, then fetch only a small ranked set.

Preserve URLs as provenance. Do not cite Foundry `workflow-fixtures/` paths in runtime output, and do not require a prebuilt Foundry exemplar index.

### 3. Normalize candidates

For each fetched candidate, use `gxwf` to normalize the workflow into a structural representation suitable for comparison. Prefer skeleton-level structure for topology, labels, tool order, workflow inputs/outputs, and collection shapes. Use more detailed gxformat2 or native workflow content only when parameter-level evidence matters.

If `gxwf` cannot normalize a candidate, keep the URL in alternates with a failure reason instead of silently dropping a promising domain match.

### 4. Rank candidates

Rank by the feature hierarchy, not by a single global similarity score. Domain and topology outrank generic tool overlap. Common tools such as `MultiQC`, `fastp`, `awk`, and `datamash` are weak signals by themselves.

Select one nearest exemplar when a clear candidate exists. Return weak alternates when they explain ambiguity or when the nearest confidence is only medium or low.

If no candidate aligns on domain or topology, return `no nearest exemplar` and compare only against known pattern pages when useful.

### 5. Produce the structural diff

Compare the draft to the nearest exemplar at the level appropriate to the draft:

- Workflow input and output shapes.
- Collection mapping, reduction, reshaping, relabeling, and synchronization motifs.
- Tabular bridges, joins, filters, aggregation, and report assembly.
- Conditional or optional paths.
- Tool-family ordering and missing pre/post-processing steps.
- Test fixture shape and assertion style when test evidence exists.

Separate findings into:

- `aligned_patterns` — draft matches a corpus-observed structure.
- `draft_missing` — IWC consistently has structure absent from the draft.
- `draft_extra` — draft has structure not reflected in the nearest exemplar.
- `ordering_differences` — same parts, materially different order.
- `test_differences` — fixture/assertion differences.
- `speculative_findings` — low-confidence suggestions that need human review.

### 6. Route findings back to authoring

Each finding should name the authoring surface most likely to own the fix:

- Template/data-flow issue: missing node, wrong collection shape, wrong branch, placeholder too vague.
- Pattern issue: recurring Galaxy idiom should become or update a pattern page.
- Tool-step issue: exact wrapper or parameterization will be handled later.
- Test issue: defer to `nextflow-test-to-galaxy-test-plan` or `implement-galaxy-workflow-test`.

Do not block downstream authoring on low-confidence exemplar mismatches. Report them as review guidance.

## Non-goals

- **No corpus mirroring.** Runtime output cites IWC URLs; Foundry fixtures are research aids only.
- **No tool discovery.** Do not replace [[discover-shed-tool]].
- **No automatic rewrite.** This Mold emits structural diff guidance; the harness or user decides which changes to apply.
- **No forced nearest.** A no-match result is valid when IWC lacks a close exemplar.

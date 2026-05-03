# Index

Generated from content frontmatter. Do not edit by hand.

## Pipelines

- [[cwl-to-galaxy]] — Path from a CWL Workflow to a Galaxy gxformat2 workflow. Lighter upstream extraction.
- [[nextflow-to-cwl]] — Direct path from a Nextflow pipeline to a CWL Workflow + CommandLineTool set.
- [[nextflow-to-galaxy]] — Direct path from a Nextflow pipeline to a Galaxy gxformat2 workflow.
- [[paper-to-cwl]] — Direct path from a paper to a CWL Workflow + CommandLineTool set.
- [[paper-to-galaxy]] — Direct path from a paper to a Galaxy gxformat2 workflow. No CWL intermediate.

## Molds

- [[author-galaxy-tool-wrapper]] — Author a new Galaxy tool wrapper (XML) when discovery yields nothing acceptable.
- [[compare-against-iwc-exemplar]] — Find nearest IWC exemplar(s) and surface a structural diff against a draft.
- [[cwl-test-to-galaxy-test-plan]] — Translate CWL test fixtures into a Galaxy workflow test plan.
- [[debug-cwl-workflow-output]] — Triage failing CWL run outputs; classify failure modes; propose fixes.
- [[debug-galaxy-workflow-output]] — Triage failing Galaxy run outputs; classify failure modes; propose fixes.
- [[discover-shed-tool]] — Search the Tool Shed for an existing wrapper, drill from hit to a pinnable changeset, classify candidates, and recommend or fall through.
- [[find-test-data]] — Search IWC fixtures and public sources for test data matching a data-flow shape.
- [[implement-cwl-tool-step]] — Convert an abstract step into a concrete CWL CommandLineTool + step.
- [[implement-cwl-workflow-test]] — Assemble CWL job file(s) and expected-output assertions.
- [[implement-galaxy-tool-step]] — Convert an abstract step into a concrete gxformat2 step using a tool summary.
- [[implement-galaxy-workflow-test]] — Assemble Galaxy workflow test fixtures and assertions.
- [[nextflow-test-to-cwl-test-plan]] — Translate Nextflow test evidence into a CWL workflow test plan.
- [[nextflow-test-to-galaxy-test-plan]] — Translate Nextflow test evidence into a Galaxy workflow test plan.
- [[paper-to-test-data]] — Derive workflow test inputs and expected outputs from a paper.
- [[run-workflow-test]] — Execute a workflow's tests via Planemo; emit structured pass/fail and outputs.
- [[summarize-cwl]] — Surface CWL Workflow + CommandLineTool inputs, outputs, scatter, conditionals.
- [[summarize-cwl-tool]] — Derive a CommandLineTool description (container, baseCommand, IO) for a CWL target.
- [[summarize-galaxy-tool]] — Pull JSON schema, container, source, inputs/outputs for a Galaxy tool.
- [[summarize-nextflow]] — Read a Nextflow pipeline source tree and emit a structured per-source summary downstream Molds bind to.
- [[summarize-paper]] — Extract methods, tools, sample data, and references from a paper.
- [[summary-to-cwl-data-flow]] — Abstract DAG with CWL scatter / valueFrom / step idioms surfaced.
- [[summary-to-cwl-template]] — CWL Workflow skeleton with per-step TODOs from a data-flow summary.
- [[summary-to-galaxy-data-flow]] — Abstract DAG with Galaxy collection / scatter / branching idioms surfaced.
- [[summary-to-galaxy-template]] — gxformat2 skeleton with per-step TODOs from a data-flow summary.
- [[validate-cwl]] — Run cwltool --validate / schema lint, classify failures, recommend fixes.
- [[validate-galaxy-step]] — Run gxwf validation on the just-implemented Galaxy step and route failures back to step implementation.
- [[validate-galaxy-workflow]] — Run terminal gxwf validation on an assembled Galaxy workflow and classify workflow-level failures.

## Patterns

- [[collection-build-list-paired-with-apply-rules]] — Use Apply Rules to promote identifier columns into a list:paired collection, with optional cleanup first.
- [[collection-build-named-bundle]] — Use BUILD_LIST to assemble named outputs into a collection bundle for publishing or downstream fan-in.
- [[collection-cleanup-after-mapover-failure]] — Use FILTER_EMPTY or FILTER_FAILED after map-over when bad elements would break downstream collection steps.
- [[collection-flatten-after-fanout]] — Use FLATTEN to collapse nested collection outputs to a flat list once the outer axis no longer matters.
- [[harmonize-by-sortlist-from-identifiers]] — Use SORTLIST with sort_type:file to reorder one collection by another collection's identifiers.
- [[regex-relabel-via-tabular]] — Derive collection element identifiers in a tabular mapping, then apply them with RELABEL_FROM_FILE.
- [[relabel-via-rules-and-find-replace]] — Use Apply Rules, identifier extraction, find/replace, and relabeling for structural fan-out cleanup.
- [[collection-split-identifier-via-rules]] — Use Apply Rules regex columns to split one collection identifier into nested list identifiers.
- [[collection-swap-nesting-with-apply-rules]] — Use Apply Rules to regroup a list:list collection by swapping outer and inner identifier columns.
- [[sync-collections-by-identifier]] — Use collection_element_identifiers with FILTER_FROM_FILE or RELABEL_FROM_FILE to align sibling collections.
- [[collection-unbox-singleton]] — Use __EXTRACT_DATASET__ with which: first when a one-element collection must become a dataset.
- [[conditional-gate-on-nonempty-result]] — Derive a boolean from empty or non-empty data, then use when to skip reporting or export steps.
- [[conditional-route-between-alternative-outputs]] — Use when-gated alternatives plus pick_value to merge binary or one-of-N routes into one downstream value.
- [[conditional-run-optional-step]] — Use a workflow boolean connected as inputs.when to skip an optional Galaxy step or branch.
- [[conditional-transform-or-pass-through]] — Gate an optional transform, then use pick_value to pass transformed data when present or original data otherwise.
- [[galaxy-collection-patterns]] — Use this MOC to choose corpus-grounded Galaxy collection transformation patterns.
- [[galaxy-conditionals-patterns]] — Use this MOC to choose corpus-grounded Galaxy when and pick_value conditional patterns.
- [[galaxy-tabular-patterns]] — Use this MOC to choose corpus-grounded Galaxy tabular transformation patterns.
- [[compose-runtime-text-parameter]] — Use compose_text_param to build connected text expressions from constants plus runtime scalar values.
- [[derive-parameter-from-file]] — Read a one-value dataset with param_value_from_file, including count recipes that feed typed parameters.
- [[map-workflow-enum-to-tool-parameter]] — Use map_param_value to translate workflow enum values into downstream tool codes, flags, or snippets.
- [[tabular-compute-new-column]] — Use column_maker (Add_a_column1) with strict error_handling to insert/replace a computed column. Per-expression-kind auto_col_types rule.
- [[tabular-concatenate-collection-to-table]] — Use collapse_dataset to row-bind a collection of tabulars into one table, with optional element IDs and header dedupe.
- [[tabular-cut-and-reorder-columns]] — Use Cut1 with a comma-separated cN list to project — and reorder — columns. Listing out of order is the canonical reorder idiom.
- [[tabular-filter-by-column-value]] — Use Filter1 with a Python expression over cN columns to drop rows. Highest-frequency tabular row filter in IWC.
- [[tabular-filter-by-regex]] — Use tp_grep_tool for whole-line regex row filters on tabular input. Grep1 is the legacy alternative.
- [[tabular-group-and-aggregate-with-datamash]] — Use datamash_ops for grouped tabular aggregation: multi-column grouping, collapse, countunique, min/max, and reductions.
- [[tabular-join-on-key]] — Use tp_easyjoin_tool for two-tabular key joins; use tp_multijoin_tool for many files and query_tabular for SQL joins.
- [[tabular-pivot-collection-to-wide]] — Use collection_column_join to outer-join a collection of 2-column id/value tables into one wide table.
- [[tabular-prepend-header]] — Use tp_awk_tool to prepend a constant header line, optionally skipping or reformatting an existing first row.
- [[tabular-relabel-by-row-counter]] — Use tp_awk_tool to replace each row or label with deterministic sample_N values from awk NR.
- [[tabular-split-taxonomy-string]] — Use tp_awk_tool to split semicolon-delimited taxonomy strings into explicit rank columns with missing-rank handling.
- [[tabular-sql-query]] — Use query_tabular when SQL semantics justify it: windows, joins, anti-joins, or fused project+compute over tabulars.
- [[tabular-synthesize-bed-from-3col]] — Use tp_awk_tool to convert chrom/start/end rows into 6-column BED, subtracting 1 from start and setting constants.
- [[tabular-to-collection-by-row]] — Use split_file_to_collection split_by:col to fan a tabular into collection elements by row/key.

## Source Patterns

- [[nextflow-patterns]] — Use this source-pattern map to route recurring Nextflow channel and operator idioms to Galaxy implementation patterns.

## CLI Commands

- [[tool-revisions]] — Resolve a Tool Shed tool to changeset revisions for reproducible workflow pinning. Final step in discover-and-pin.
- [[tool-search]] — Free-text Tool Shed search returning candidate tools as JSON; first step in the discover-and-pin sequence.
- [[tool-versions]] — List TRS-published versions of a Tool Shed tool, oldest→newest. Second step in the discover-and-pin sequence.
- [[validate]] — Validate Galaxy workflow structure, tool state, and optional connection compatibility before runtime execution.
- [[validate-tests]] — Validate Galaxy workflow test files and optionally cross-check labels against their workflow.

## Schemas

- [[tests-format]] — JSON Schema for the planemo workflow test format (`<workflow>-tests.yml`), vendored from `@galaxy-tool-util/schema`.
- [[summary-nextflow]] — JSON Schema for the structured summary emitted by the summarize-nextflow Mold.

## Component Research

- [[component-nextflow-containers-and-envs]] — Stub. Biocontainers / bioconda equivalence, Docker/Singularity refs, container directive resolution. Grows from cast contact — see issue #17.
- [[component-nextflow-inspect]] — White paper on Nextflow's native introspection subcommands — `nextflow inspect`, `nextflow config`, and adjacent tooling. Survey, not decision.
- [[component-nextflow-pipeline-anatomy]] — Stub. DSL2 layout, channel idioms, operator-chain reading rules. Grows from cast contact with rnaseq/sarek/ad-hoc — see issue #17.
- [[component-nextflow-testing]] — Stub. conf/test.config, nf-core/test-datasets, nf-test idioms, samplesheet conventions. Grows from cast contact — see issue #17.
- [[component-nf-core-tools]] — White paper on nf-core/tools — conventions, CLI surface, schema universe, container resolution. Survey, not decision.
- [[component-tool-shed-search]] — Tool Shed's Whoosh repo/tool search and partial GA4GH TRS v2, indexed from hg-walked metadata with no auto-refresh on upload
- [[galaxy-apply-rules-dsl]] — Reference for Galaxy's Apply Rules DSL: rule operations, mapping operations, composition patterns, pitfalls.
- [[galaxy-collection-semantics]] — Vendored formal spec of Galaxy dataset-collection mapping/reduction semantics, with labeled examples and pinned test references.
- [[galaxy-collection-tools]] — Catalog of Galaxy's collection-operation tools — purpose, IO, parameters, selection guide. Companion to galaxy-collection-semantics.
- [[galaxy-tool-job-failure-reference]] — Reference for Galaxy tool stdio rules, job failure detection, job states, and job API failure surfaces.
- [[galaxy-xsd]] — Vendored Galaxy tool XML schema for wrapper structure, parameters, outputs, tests, and assertion syntax.
- [[galaxy-workflow-invocation-failure-reference]] — Reference for Galaxy workflow invocation states, messages, failure reasons, and invocation API surfaces.
- [[galaxy-workflow-testability-design]] — Design guidance for Galaxy workflow inputs, outputs, and checkpoints that make IWC-style workflow tests possible.
- [[iwc-conditionals-survey]] — Corpus survey of Galaxy conditional step usage in IWC, covering when-gates, boolean shims, and routed output selection.
- [[iwc-map-over-lifecycle-survey]] — Survey of IWC map-over lifecycle recipes, with a Nextflow-to-Galaxy crosswalk for collection construction, cleanup, reshape, reduce, and publish phases.
- [[iwc-nearest-exemplar-selection]] — Defines a feature hierarchy for selecting useful IWC exemplar workflows for structural comparison.
- [[iwc-parameter-derivation-survey]] — Corpus survey of Galaxy workflow recipes that turn upstream data, metadata, or small files into runtime parameters.
- [[iwc-shortcuts-anti-patterns]] — What IWC test suites cut corners on (accepted) vs what's a code smell — existence-only probes, sim_size deltas, image dim checks, label coupling.
- [[iwc-tabular-operations-survey]] — Corpus survey of tabular tools and operations across IWC workflows; map for the leaf pattern hierarchy on row/column data manipulation.
- [[iwc-test-data-conventions]] — How IWC workflows organize and reference test data — Zenodo-first, SHA-1 integrity, collection shapes, CVMFS gotchas.
- [[iwc-transformations-survey]] — Corpus survey of collection-shape transformations across IWC: built-in collection ops, toolshed transformers, and the multi-step recipes that bracket map-over.
- [[iwc-workflow-testability-survey]] — IWC evidence survey for Galaxy workflow structures that make workflow tests meaningful.
- [[nextflow-operators-to-galaxy-collection-recipes]] — Classifies common Nextflow operators as Galaxy wiring, collection semantics, explicit steps, or review triggers.
- [[nextflow-to-galaxy-channel-shape-mapping]] — Maps common Nextflow channel, tuple, and path shapes to Galaxy dataset and collection shapes.
- [[planemo-asserts-idioms]] — Decision and idiom guide for picking planemo workflow-test assertions: which family per output type, how to size tolerances, when to validate.
- [[planemo-workflow-test-architecture]] — Reference for Planemo workflow test/run architecture, Galaxy modes, API polling, and noisy failure boundaries.

## Design Specs

- [[galaxy-data-flow-draft-contract]] — Defines the proposed boundary between Galaxy data-flow drafts, gxformat2 templates, and concrete step implementation.
- [[galaxy-tool-summary-input-source]] — Decides that summarize-galaxy-tool reads cached ParsedTool JSON as its v1 input source.
- [[iwc-exemplar-runtime-discovery]] — Resolves runtime IWC exemplar discovery through live IWC URLs plus gxwf processing.

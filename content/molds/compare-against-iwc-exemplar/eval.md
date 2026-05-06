# compare-against-iwc-exemplar eval

## Case: nf-core rnaseq nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft derived from nf-core/rnaseq.
- expectation: selects `transcriptomics/rnaseq-pe` (or sibling RNA-seq IWC workflow) at high confidence, citing the IWC URL plus alignment on domain, paired-FASTQ topology, align/count/report tool families, and MultiQC aggregation.

## Case: nf-core viralrecon nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft derived from nf-core/viralrecon.
- expectation: selects an IWC SARS-CoV-2 variation-reporting exemplar at medium confidence, naming the shared variation-analysis structure and the workflow-scope mismatch.

## Case: nf-core mag nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft derived from nf-core/mag.
- expectation: selects an IWC microbiome MAG-generation exemplar at high confidence and calls out collection, binning, annotation, and report-assembly differences.

## Case: no acceptable exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft whose domain, tool families, topology, or output intent has no close IWC match.
- expectation: returns "no nearest exemplar" instead of forcing a nearest, lists the top weak candidates with rationale, and refuses high confidence on tool-overlap-only matches (`MultiQC`, `fastp`, `awk`, `datamash`).

## Case: IWC clone reuse

- check: deterministic
- fixture: second invocation against the same IWC `<url>` after a prior run populated `~/.foundry/iwc`.
- expectation: pulls and merges into the existing clone instead of re-cloning, and proceeds without network errors when offline if the local clone is current.

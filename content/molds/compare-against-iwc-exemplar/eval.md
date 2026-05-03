# compare-against-iwc-exemplar eval

## Case: nf-core rnaseq nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft or data-flow template derived from nf-core/rnaseq after the exemplar-discovery mechanism is resolved.
- expectation: selects an IWC transcriptomics RNA-seq exemplar such as `transcriptomics/rnaseq-pe` with high confidence, emits schema-valid structural diff JSON, and explains alignment on domain, collection topology, tool families, outputs, and tests.

## Case: nf-core viralrecon nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft or data-flow template derived from nf-core/viralrecon after the exemplar-discovery mechanism is resolved.
- expectation: selects an IWC SARS-CoV-2 variation-reporting exemplar with medium confidence, emits schema-valid structural diff JSON, and explains both shared variation-analysis structure and mismatched workflow scope.

## Case: nf-core mag nearest exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft or data-flow template derived from nf-core/mag after the exemplar-discovery mechanism is resolved.
- expectation: selects an IWC microbiome MAG-generation exemplar with high confidence, emits schema-valid structural diff JSON, and identifies collection, binning, annotation, and report-assembly structure differences.

## Case: no acceptable exemplar

- check: deterministic + llm-judged
- fixture: Galaxy draft whose domain, tool families, topology, or output intent has no close IWC match in the configured exemplar source.
- expectation: returns a low-confidence or no-match result instead of forcing a nearest exemplar, records the top weak candidates, and scopes which structural findings are speculative.

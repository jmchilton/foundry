# summarize-galaxy-tool eval

## Case: FastQC simple wrapper

- check: deterministic
- fixture: chosen Galaxy tool input source for FastQC after the input-source decision is resolved.
- expectation: emits a Galaxy tool summary that validates against the future `summary-galaxy-tool` schema and includes tool id, version, owner/source context, command shape, inputs, outputs, requirements, citations, and tests when present.

## Case: bwa_mem2 conditional inputs

- check: llm-judged
- fixture: chosen Galaxy tool input source for a bwa_mem2 wrapper with conditional `when` branches.
- expectation: reconstructs conditional parameter structure clearly enough for downstream step implementation to bind the correct branch-specific inputs without flattening away branch ownership.

## Case: samtools_sort data-table reference

- check: llm-judged
- fixture: chosen Galaxy tool input source for a samtools_sort wrapper with data-table-backed parameters or reference-genome selection.
- expectation: records data-table reference inputs, allowed fallback behavior, and unresolved runtime dependencies so downstream implementation can distinguish user parameters from Galaxy instance configuration.

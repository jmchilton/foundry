# discover-shed-tool eval

## Case: fastqc exact hit

- check: deterministic
- fixture: step need `quality control for FASTQ reads using FastQC`
- expectation: recommends an installable FastQC Tool Shed wrapper with owner, repo, tool id, version, and changeset revision.

## Case: ambiguous wrapper family

- check: llm-judged
- fixture: step need with multiple plausible wrappers across owners or similarly named repositories.
- expectation: classifies the result as `weak`, explains the ambiguity, and surfaces alternates instead of silently pinning a low-confidence hit.

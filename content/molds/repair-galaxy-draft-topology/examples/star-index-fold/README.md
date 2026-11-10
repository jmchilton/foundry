# star-index-fold

Synthetic. Built from the account in [galaxyproject/foundry#678](https://github.com/galaxyproject/foundry/issues/678): a Deferred `STAR genome index` step feeds two STAR alignments, and `iuc/rgrnastar/rna_star` runs STAR but has no index output.

- `galaxy-workflow-draft.gxwf.yml`: the draft when the loop picks `star_genome_index`. Both `rna_star` steps are identity-pinned, because the picker waits on their index source.
- `open-requirements.ledger.yml`: the blocking entry `implement-galaxy-tool-step` raises on it. Its outputs and `geneSource` option are quoted from `galaxy-tool-cache summarize` of `rna_star` 2.7.11b+galaxy1.
- `folded.gxwf.yml`: the expected draft after the fold. The wiring follows `../star-sa-index-input/`.

Both drafts pass `gxwf draft-validate` 1.15.0.

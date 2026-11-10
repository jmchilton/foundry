# discover-shed-tool scenarios

## Case: fastqc exact hit

- fixture: step need `quality control for FASTQ reads using FastQC`
- expect: recommends an installable FastQC Tool Shed wrapper with owner, repo,
  tool id, version, and changeset revision.

## Case: STAR index need

- fixture: step need `build a STAR genome index (STAR --runMode genomeGenerate)
  for the aligner steps`.
- expect: `hit` or `weak` with `iuc/rgrnastar/rna_star` as `candidate`, never
  `miss`. No `data_manager_*` repo is the candidate.

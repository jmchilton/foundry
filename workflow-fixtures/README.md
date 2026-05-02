# workflow-fixtures

Local generated-corpus workspace for the Foundry. Materializes:

- IWC `gxformat2` workflows (via `gxwf clean-tree` + `convert-tree`) under `iwc-format2/`.
- IWC skeletons (structural-only views) under `iwc-skeletons/`.
- Pinned Nextflow pipeline working trees under `pipelines/` (legacy; for `review-nextflow` research).

Outputs are gitignored — re-materialize from the pinned SHAs in `fixtures.yaml`. Not part of the Foundry content model; not a runtime/cast dependency. Cited from Foundry notes via `$IWC_FORMAT2/...` and `$IWC_SKELETONS/...` (see `../common_paths.yml.sample`).

## Usage

```sh
make all          # nextflow pipelines + IWC format2 + skeletons
make nextflow     # nextflow only
make iwc          # IWC only (clone, clean, convert to format2)
make skeletons    # iwc-format2/ -> iwc-skeletons/ (strip non-structural fields)
make verify       # fetch + assert pinned SHAs
make clean        # rm pipelines/ iwc-src/ iwc-cleaned/ iwc-format2/ iwc-skeletons/
```

Or call the scripts directly:

```sh
scripts/fetch.sh                 # fetch/update all nextflow pipelines
scripts/fetch.sh nf-core/demo    # single pipeline
VERIFY=1 scripts/fetch.sh        # assert HEAD matches pinned SHA
scripts/build-iwc.sh             # IWC corpus -> iwc-format2/
tsx scripts/build-skeletons.ts   # iwc-format2/ -> iwc-skeletons/
```

Working trees:
- `pipelines/<org>__<name>/` — nextflow clones at pinned SHA (detached HEAD).
- `iwc-src/` — IWC clone at pinned SHA.
- `iwc-cleaned/` — `gxwf clean-tree` output (intermediate `.ga`).
- `iwc-format2/` — final `.gxwf.yml` corpus, mirrors IWC `workflows/` tree.
- `iwc-skeletons/` — structural-only views of `iwc-format2/`, mirrors that tree.

The fixture scripts read `fixtures.yaml` with Node + `js-yaml`. The IWC pipeline shells out to `gxwf` via `npx -p @galaxy-tool-util/cli` (no global install needed; cached after first run).

## Skeletons

A skeleton is an `iwc-format2/.../foo.gxwf.yml` workflow with non-structural fields stripped, leaving roughly:

- `tool_id`, `label`, `annotation` per step
- `in:` / `out:` / `step_inputs` (the topology)
- `when:` expressions and other control flow
- workflow-level `inputs:` / `outputs:`

Dropped: `tool_state` parameter blobs, `position:` UI metadata, step-level `comments:`, `uuid` and other non-structural IDs.

Each skeleton is ~5–20KB instead of ~100KB–1MB; all 120 fit in agent context. Used by `/iwc-survey` as a cheap first-pass scan for step-pair / step-sequence patterns before drilling into `$IWC_FORMAT2`. See `../docs/CORPUS_INGESTION.md`.

## Adding a Nextflow fixture

1. Append an entry to `fixtures.yaml` with `name`, `tier`, `repo`, `tag`, `sha`, `notes`.
2. Resolve the SHA for the tag:

   ```sh
   gh api repos/<org>/<name>/git/ref/tags/<tag> --jq '.object.sha'
   # if object.type is "tag" (annotated), dereference:
   gh api repos/<org>/<name>/git/tags/<sha> --jq '.object.sha'
   ```

3. Run `scripts/fetch.sh <org>/<name>` to verify.

## Tiers (Nextflow)

- `tiny` — minimal, bootstrap / smoke tests
- `small` — mostly linear, clean patterns
- `large` — many profiles, complex config; edge-case stress

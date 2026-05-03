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

1. Append an entry to `fixtures.yaml` with `name`, `flavor`, `tier`, `repo`, `sha`, `notes`. Add `tag` if the upstream has a release; omit for HEAD-pinned pipelines.
2. Resolve the SHA:

   For tagged releases:

   ```sh
   git ls-remote https://github.com/<org>/<name> refs/tags/<tag>
   # if the tag is annotated, peel it:
   git ls-remote https://github.com/<org>/<name> refs/tags/<tag>^{}
   ```

   For HEAD-pinned (no releases):

   ```sh
   git ls-remote https://github.com/<org>/<name> HEAD
   ```

3. Run `scripts/fetch.sh <org>/<name>` to verify.

## Flavors (Nextflow)

- `nf-core` — follows the nf-core template (`modules/nf-core/`, `subworkflows/nf-core/`, `nextflow_schema.json`, per-module `meta.yml`, nf-test under `tests/`).
- `adhoc` — any DSL2 pipeline that does not follow the nf-core template. Used to stress-test `summarize-nextflow` against non-nf-core conventions: custom layouts, missing schema/meta, non-`main.nf` entrypoints, alternate test conventions, non-bio domains.

## Tiers (Nextflow)

Rough size buckets, both flavors:

- `tiny` — minimal, bootstrap / smoke tests
- `small` — mostly linear, clean patterns
- `large` — many processes/profiles or heavy config; edge-case stress

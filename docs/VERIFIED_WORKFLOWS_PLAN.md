# Plan: Verified pattern workflows (Issue #84)

Hand-off plan for an implementation agent. Companion to <https://github.com/jmchilton/foundry/issues/84>.

The first verified workflow targets `[[conditional-gate-on-nonempty-result]]`. Survey context: `content/research/iwc-conditionals-survey.md` Candidate C. Pattern body already carries a "Verification TODO" section pointing here.

## 1. Goal and scope

- Add a small, checked-in Galaxy workflow that exercises the non-empty gate operation end to end and produces deterministic outputs that prove the gate took the right branch.
- Add a CI surface that lints and tests verified workflows via Planemo, with no IWC-style sharding/deploy machinery.
- Add the minimum frontmatter contract so a pattern page can declare *which* verified workflow(s) it owns and *what kind of evidence* backs it (corpus, structurally-verified, both, hypothesis).
- Document the verification result on `[[conditional-gate-on-nonempty-result]]` and update Candidate C in `[[iwc-conditionals-survey]]` accordingly.

Out of scope: building a generator/cast that emits verified workflows, RO-Crate metadata, Dockstore wiring, multi-Galaxy-version matrices, scheduled re-runs against latest Galaxy.

## 2. Layout

New top-level directory, sibling to `content/` and `workflow-fixtures/`:

```
verification/
  README.md                                              # what this tree is, how to run, eligibility rules
  workflows/
    conditional-gate-on-nonempty-result/
      README.md                                          # one paragraph: what is verified, why this shape
      gate-on-nonempty.gxformat2.yml                     # the verified workflow (format2, hand-authored)
      gate-on-nonempty-tests.yml                         # planemo workflow tests
      test-data/
        empty.txt                                        # zero-byte gate-false input
        nonempty.txt                                     # tiny gate-true input
        expected_skipped_marker.txt                      # expected output when gate is false
        expected_ran_marker.txt                          # expected output when gate is true
```

Why outside `content/`:

- The validator's `findMdFiles` walks the directory it's given (currently `content/`); fixtures live as raw `.gxformat2.yml`/`.yml`/`.txt`, not Foundry notes, and shouldn't get a frontmatter contract.
- IWC's `workflows/<repo>/{name.ga, name-tests.yml, test-data/}` shape is the right cognitive shape for a Galaxy reader; mirror it.
- A pattern page references its verified workflow via wiki link to a *content note* (see §3), not directly to `verification/workflows/...`. The content note is the indirection layer.

Why `gxformat2`, not `.ga`:

- Foundry already ingests `.gxformat2.yml` everywhere (`$IWC_FORMAT2`, summary/casting design); authoring matches house style.
- Hand-readable; small enough that diff review is sensible.
- Planemo accepts gxformat2 directly.

If a particular verified workflow only roundtrips reliably through `.ga`, allow `.ga` instead and note the reason in the workflow's `README.md`. Do not pre-commit to one or the other globally.

## 3. Content-side surface (one note per verified workflow)

Each verified workflow gets one Foundry note so it shows up in the site, can be wiki-linked, and lets the schema enforce the link from pattern pages back to specific verifications.

### 3a. New note type: `verification`

In `meta_schema.yml`:

- Add `verification` to `type.enum`.
- Add required-extras for `type: verification` via `allOf/if/then`: `[title, workflow_path, target, verification_status]`.
- Add typed fields:
  - `workflow_path`: string, relative path under `verification/workflows/<slug>/` (e.g. `verification/workflows/conditional-gate-on-nonempty-result/gate-on-nonempty.gxformat2.yml`). Validator should check the file exists.
  - `target`: reuse existing `target` enum (`galaxy | cwl | web | generic`).
  - `verification_status`: enum `[passing, failing, skipped]`. Updated by hand when a verification breaks; CI failure should also surface this.
  - `verifies_pattern`: required wiki-link (single, regex like other wiki-link fields) — the pattern this workflow attests.
  - Optional `notes_md` is unnecessary; the note body carries prose.

In `meta_tags.yml`:

- Add `verification` tag.
- Add `target/galaxy` already exists; reuse.

Validator (`scripts/validate.ts`):

- Extend `TYPE_TAG_MAP` with `"verification|": "verification"`.
- Add a check that `workflow_path` resolves to an existing file relative to repo root.
- Add a check that `verifies_pattern` resolves like other wiki-link fields.

### 3b. Where notes live

`content/verification/<slug>.md` — flat, single file per verified workflow (not a directory note; no companions needed in v1).

For the first one: `content/verification/conditional-gate-on-nonempty-result.md`.

### 3c. Pattern-side: declare verifications via typed field

In `meta_schema.yml`:

- Add `verifications`: array of wiki-links (regex like `related_patterns`).
- Add `evidence`: enum `[corpus-observed, structurally-verified, corpus-and-verified, hypothesis]`. Required *only* when `type: pattern` (extend the pattern `then` block to add `evidence` to its `required:` list alongside `title, pattern_kind`).

Validator:

- For `type: pattern`, if `verifications` is non-empty, every entry must resolve to a `type: verification` note.
- Cross-check `evidence` vs `verifications`: `structurally-verified` and `corpus-and-verified` both require `verifications.length >= 1`; `corpus-observed` and `hypothesis` require it to be empty or absent. Errors, not warnings.

Update `[[conditional-gate-on-nonempty-result]]`:

- Add `verifications: ["[[conditional-gate-on-nonempty-result-verification]]"]` (or whichever slug is chosen — match the file name in `content/verification/`).
- Set `evidence: corpus-and-verified` once the verification lands and passes.

Backfill on existing patterns: every other pattern note needs `evidence:` set too — almost all are `corpus-observed` today. Bulk-set in the same PR as the schema change to keep validator green. (See §6 task list.)

## 4. The verification candidates to actually try

The implementor should try the candidates in this order and keep whichever passes; the workflow file should embody the *winner* and the README.md should record what was tried and why.

1. **Direct `when` over a connected collection value.** If gxformat2 + Galaxy let `when:` consume a collection-derived value without a shim (e.g. coerced via parameter type), this is the cleanest shape and should win. Likely doesn't work as plainly as one would hope; the survey already implies it doesn't, hence the MGnify shim. Confirm or refute.
2. **Expression-tool boolean shim.** A single `__EXPRESSION__`/expression-tool step that returns `true` when an upstream collection has elements (or a dataset has bytes) and `false` otherwise. Two steps total: expression-tool + gated downstream step.
3. **MGnify-style four-step shim.** `collection_element_identifiers → wc_gnu → column_maker(c1 != 0) → param_value_from_file → when`. Known-good fallback. If 1 and 2 both fail or produce ugly roundtrips, ship this and document why the shorter routes don't work.

The verification workflow should:

- Take a single collection input (call it `inputs`).
- Compute the gate boolean (whichever of 1/2/3 wins).
- Have one optional step downstream — e.g. a `tp_cat` that concatenates collection elements into a marker file — gated by `when: $(inputs.when)`.
- Have a deterministic output that proves which branch ran. Two test cases in `gate-on-nonempty-tests.yml`:
  - **`gate_true`**: input collection has one tiny element (`nonempty.txt`); assert the optional step's output exists and content matches `expected_ran_marker.txt`.
  - **`gate_false`**: input collection has zero elements (or one empty file, depending on what the chosen shim distinguishes); assert the optional step did not produce the marker output, or that its output is the documented "skipped" sentinel.

Use planemo `outputs:` `file:` exact comparison for the small expected baselines (matches `iwc-test-data-conventions.md` §1 rule "expected-output baseline that's small — commit to test-data/"). Don't use Zenodo for these inputs; everything is byte-scale and in-tree.

`gate-on-nonempty-tests.yml` shape (per `iwc-test-data-conventions.md`):

```yaml
- doc: "Gate true: non-empty input runs the optional step"
  job:
    inputs:
      class: Collection
      collection_type: list
      elements:
        - identifier: only
          class: File
          path: test-data/nonempty.txt
          filetype: txt
  outputs:
    gated_marker:
      file: test-data/expected_ran_marker.txt

- doc: "Gate false: empty input skips the optional step"
  job:
    inputs:
      class: Collection
      collection_type: list
      elements: []
  outputs:
    gated_marker:
      file: test-data/expected_skipped_marker.txt
```

Adjust `outputs:` keys to whatever the workflow actually labels.

If candidate 1 truly cannot be expressed (no roundtrippable form), the workflow file embodies whichever shorter candidate works, and the README documents the negative result for #1 with a one-line reproduction note. Negative findings are part of the deliverable.

## 5. CI

New file: `.github/workflows/verification-workflows.yml`. Single job, no sharding, no deploy.

Trigger:

```yaml
on:
  pull_request:
    paths:
      - 'verification/workflows/**'
      - '.github/workflows/verification-workflows.yml'
  push:
    branches: [main]
    paths:
      - 'verification/workflows/**'
      - '.github/workflows/verification-workflows.yml'
```

Job (single):

- `runs-on: ubuntu-latest`
- `services.postgres` with the same Postgres 11 + creds shape IWC uses (planemo-ci-action expects it).
- `actions/checkout@v4`
- `actions/setup-python@v5` with `python-version: '3.11'`.
- `actions/cache@v4` for `~/.cache/pip` keyed on python version + Galaxy SHA (look up via `git ls-remote` like IWC's setup job; just inline it, no separate `setup` job).
- `insightsengineering/disk-space-reclaimer@v1` (Planemo + Galaxy chew disk).
- `galaxyproject/planemo-ci-action@v1` with `mode: lint`, `workflows: true`, `additional-planemo-options: --iwc`, `repository-list:` set to the verification dir (see below).
- `galaxyproject/planemo-ci-action@v1` with `mode: test`, `workflows: true`, `setup-cvmfs: true`, `galaxy-fork: galaxyproject`, `galaxy-branch: release_25.1`, `chunk: 0`, `chunk-count: 1`.
- `actions/upload-artifact@v4` for `upload/`.
- `galaxyproject/planemo-ci-action@v1` with `mode: check` to fail the job on any failed test.

Skip everything from IWC's `ci.yaml` we don't need: `setup` discovery job (no commit-range repo enumeration; we always test the whole `verification/workflows/` tree, it stays small), `chunk-count`/`chunk-list` matrix, `combine_outputs` (one chunk = no combine), `deploy` and `deploy-report` (no `iwc-workflows` namespace), `determine-success` (one job's failure already fails the workflow), `slash.yaml`/`comment_on_pr.yml`/`enable_ci_workflows.yml`/`pr_without_change.yml`/`usegalaxy-star-installation.yml`/`check_deployments.yml` (all IWC operational concerns).

`repository-list` for planemo-ci-action: investigate whether the action can be pointed at an arbitrary directory or whether it expects IWC's `workflows/<category>/<repo>/` two-level layout. Two viable routes:

- **A (preferred):** put the verified-workflows tree at `verification/workflows/<repo>/` with no category dir, and pass `repository-list` as a one-line file naming each `verification/workflows/<slug>` entry. Confirm planemo-ci-action accepts arbitrary roots; if not, pass the explicit list.
- **B (fallback):** call `planemo lint --iwc` and `planemo test` directly with `pip install planemo` rather than the action. Less polish but avoids assumption that the action understands non-IWC layouts. Use this if A turns out to require contortions.

Implementor: try A first, fall back to B if `planemo-ci-action` insists on the IWC tree shape. Document the choice in `verification/README.md`.

Pin to `release_25.1` like IWC. Bump in lockstep with IWC when they bump.

## 6. Task list for the implementation agent

Order matters; each task should pass `npm run validate && npm run test` before the next begins.

1. **Schema + tag changes (no content yet).**
   - Edit `meta_schema.yml`: add `verification` to `type.enum`; add `workflow_path`, `verification_status`, `verifies_pattern`, `verifications`, `evidence` properties; add `allOf/if/then` for `type: verification`; extend pattern `then` to require `evidence`.
   - Edit `meta_tags.yml`: add `verification` tag.
   - Edit `scripts/validate.ts`: add `"verification|": "verification"` to `TYPE_TAG_MAP`; add `verifies_pattern: "single"` and `verifications: "array"` to `WIKI_LINK_FIELDS`; add cross-checks (workflow_path file existence, evidence ↔ verifications consistency).
   - Add tests in `tests/validate.test.ts` for: a passing verification note, a missing-file `workflow_path`, an `evidence: structurally-verified` pattern with no `verifications`, an `evidence: corpus-observed` pattern with `verifications` (should error).
   - Backfill `evidence:` on every existing pattern in `content/patterns/`. Default to `corpus-observed` (most are); spot-check a handful to ensure they aren't actually hypothesis-only. Run `npm run validate` to prove green.
2. **Verification fixture skeleton.**
   - Create `verification/README.md` (~30 lines: what this tree is, how to run locally with `planemo test`, eligibility, where corresponding content notes live, link to this plan).
   - Create `verification/workflows/conditional-gate-on-nonempty-result/` with stub `README.md` + `test-data/` (empty + nonempty inputs + expected baselines TBD until candidate is chosen).
3. **Try Candidate 1 (direct `when` over collection value).**
   - Author smallest possible gxformat2 workflow; run `planemo lint --iwc` and `planemo test` locally.
   - If it works, write the test YAML, generate expected output baselines, commit.
   - If it doesn't work (expected likely), write a one-paragraph negative note in the workflow's `README.md` and continue to Candidate 2. Keep the failed attempt in the README, not in the committed `.gxformat2.yml`.
4. **Try Candidate 2 (expression-tool shim).**
   - Same loop. If it works and is cleaner than the MGnify chain (it should be), this becomes the committed workflow.
5. **Candidate 3 (MGnify shim) only if 1 and 2 both fail.**
   - Direct port of the corpus recipe (`collection_element_identifiers → wc_gnu → column_maker → param_value_from_file → when`), trimmed to one gated step.
6. **Pin and roundtrip.**
   - Run `gxwf validate` (and `gxwf clean` / `gxwf convert` if relevant) on the chosen workflow to confirm it survives the Foundry's own validation.
   - Run `planemo lint --iwc` and `planemo test` once more to confirm green locally.
7. **Add the content note.**
   - Create `content/verification/conditional-gate-on-nonempty-result.md` with frontmatter (`type: verification`, `target: galaxy`, `verification_status: passing`, `workflow_path: verification/workflows/conditional-gate-on-nonempty-result/<chosen>.gxformat2.yml`, `verifies_pattern: "[[conditional-gate-on-nonempty-result]]"`, normal base fields). Body documents which candidate won and why.
   - Update `content/patterns/conditional-gate-on-nonempty-result.md`: add `verifications:` and set `evidence: corpus-and-verified` (or `structurally-verified` if the survey's corpus claim turns out shaky in retest — unlikely). Replace the "Verification TODO" section with a "Verification" section that points at the new note and summarizes the chosen recipe.
   - Update `content/research/iwc-conditionals-survey.md` Candidate C: replace the "TODO" with the verification outcome and a link to the verification note.
8. **CI.**
   - Add `.github/workflows/verification-workflows.yml` per §5.
   - Push a no-op edit under `verification/workflows/` to confirm the workflow fires and passes.
9. **PR.**
   - Title: `verified workflows: conditional-gate-on-nonempty-result (#84)`.
   - Body summarizes: schema change + first verified workflow + CI. Link Issue #84.
   - Note: this is the v1 surface. Future verifications drop in as `verification/workflows/<slug>/` + `content/verification/<slug>.md` with no further schema work.

## 7. Acceptance criteria

- `npm run validate && npm run test && npm run typecheck` green locally and in repo CI.
- New `.github/workflows/verification-workflows.yml` runs on a PR that touches `verification/workflows/**` and reports green.
- `content/patterns/conditional-gate-on-nonempty-result.md` carries `evidence:` and `verifications:`; site renders the link.
- `content/verification/conditional-gate-on-nonempty-result.md` exists, validates, and points at a real `.gxformat2.yml` that planemo lints + tests pass on.
- The pattern's "Verification TODO" prose is replaced with a verification result that says either "shorter route works, MGnify shim is fallback" or "MGnify shim is the only validated route, here's what was tried".
- `iwc-conditionals-survey.md` Candidate C records the outcome.
- One verification dir, one content note, one CI workflow file. No leftover TODOs in committed code.

## 8. Open questions

- Schema: split `evidence` into derived flags (`corpus_observed: bool` + presence of `verifications`) instead of an enum? Enum is more explicit but redundant with `verifications.length`. Plan uses enum; flip if reviewer prefers derivation.
- Should `verification_status` failures fail `npm run validate` locally too, or only show in CI? Plan: validate-time warning, CI-time error, since local devs may legitimately be mid-fix.
- Naming: `verification/workflows/` vs `verification/` (skip `workflows/` since the whole tree is workflows for now). Plan keeps `workflows/` to leave room for sibling kinds (e.g. `verification/datasets/`, `verification/tools/`) without renaming later.
- Galaxy fork/branch: pin to `release_25.1` to match IWC. Acceptable to drift later, but the verification value is "this is a shape Galaxy actually runs," so matching IWC's pinned target is the most honest claim.
- Does the chosen Candidate 2 expression-tool shim deserve to *replace* the MGnify recipe in the pattern body's "Idiomatic Shapes" section, or live alongside it as the lead recommendation with MGnify demoted to "corpus precedent"? Plan: lead with the verified shorter shape, demote MGnify to corpus precedent, but keep the MGnify exemplars list intact since those are the authoritative IWC citations.
- If Candidate 1 *does* work cleanly (low probability), should the pattern be marked closer to a no-shim-needed recommendation and the survey's claim about MGnify clunkiness softened? Yes — but only if the implementor is confident the workflow roundtrips through `gxwf` and re-imports back to a Galaxy server without rewriting.

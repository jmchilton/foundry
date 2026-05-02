# Initial Compilation Pipeline

Initial sketch of how Molds become cast artifacts. Anchored to the file layout in `ARCHITECTURE.md` (`molds/<name>/` → `casts/<target>/<name>/`). Working premise: **LLM-driven, evolution-friendly, reproducible enough to diff**. Casting is not deterministic; it is recorded.

## What casting is

Casting takes a Mold (a typed reference manifest plus a procedural body) and its declared references — pattern pages, CLI manual pages, IO schemas, prompt fragments, examples, and operational research notes — and produces a target-specific cast artifact. The cast is **condensed and isolated** — no links back to the Foundry, no runtime dependency on it.

Casting operates as **per-kind dispatch** over the manifest, not a single resolve-and-inline pass. Different reference kinds get different transformations:

| Reference kind | Source location | Casting transformation | Lands at |
|---|---|---|---|
| `pattern` | `content/patterns/*.md` | LLM-condensed, mixed verbatim + summarization | inlined into `SKILL.md` (or `references/patterns/` for large pages) |
| `cli-command` | `content/cli/<tool>/<cmd>.md` | Cast to structured JSON sidecar | `references/cli/<tool>/<cmd>.json` |
| `schema` | `content/schemas/<name>.schema.json` (Foundry-authored, paired with a `<name>.md` schema note) **or** vendored from an upstream npm/PyPI package and registered in `site/src/lib/schema-registry.ts` (canonical case: `@galaxy-tool-util/schema` for the workflow test-format) | Verbatim copy | `references/schemas/<name>.schema.json` |
| `prompt` | `content/prompts/*.md` | Inlined verbatim, no LLM rewrite | inlined into `SKILL.md` or `references/prompts/` |
| `example` | `content/molds/<slug>/examples/`, shared `content/examples/` | Verbatim copy | `references/examples/` |
| `research` | `content/research/*.md` or paired structured sources under `content/research/` | Verbatim copy or LLM condensation, controlled by the reference `mode` | `references/notes/` or inlined excerpt |
| `eval` | `content/molds/<slug>/eval.md` | **Never packaged** | — (Foundry-only) |
| `mold` (smell) | another Mold | Discouraged; see Open questions | — |

Verbatim-copy paths are deterministic; LLM-driven condensation is reserved for kinds where it adds value (patterns, research notes, partial manpage extracts when only a slice is referenced). `mode: condense` is part of the manifest schema now, but the generic condensation handler is not implemented yet; casting is incomplete until it can honor that mode for every kind that allows it.

### Typed reference manifest

Molds may declare the new object-shaped `references` manifest. It is additive during migration and will replace `patterns`, `cli_commands`, `prompts`, and `examples` once enough Molds have moved. `input_schemas` and `output_schemas` remain explicit Mold IO fields for now because they describe the Mold contract as well as cast packaging.

```yaml
references:
  - kind: schema
    ref: "content/schemas/summary-nextflow.schema.json"
    used_at: both
    load: upfront
    mode: verbatim
    evidence: cast-validated
    purpose: "Validate emitted summary JSON."
  - kind: research
    ref: "[[component-nextflow-testing]]"
    used_at: runtime
    load: on-demand
    mode: condense
    evidence: hypothesis
    purpose: "Extract nf-test fixtures and snapshots."
    trigger: "When filling test_fixtures or nf_tests."
    verification: "Run the generated summarize-nextflow skill on nf-core/bacass and confirm nf_tests extraction improves."
```

Field contract:

- `kind` selects the resolver and transformation handler: `pattern`, `cli-command`, `schema`, `prompt`, `example`, or `research`.
- `ref` is a wiki link for note-backed kinds (`pattern`, `cli-command`, `prompt`, `research`) and a path for file-backed kinds (`schema`, `example`).
- `used_at` is `cast-time`, `runtime`, or `both`; it says whether the reference is consumed while building the cast, consulted by the generated skill at runtime, or both.
- `load` is `upfront` or `on-demand`; it is the progressive-disclosure contract and should be honored by generated skill instructions and sidecar layout.
- `mode` is `verbatim`, `condense`, `sidecar`, or `copy`; it declares the transformation, even when that transformation is not fully implemented yet.
- `evidence` is `hypothesis`, `corpus-observed`, or `cast-validated`; it records whether the connection is speculative, observed in real-world source/corpus work, or verified by a generated-skill run.
- `verification` is required when `evidence: hypothesis`; it names the real-data run or check needed to prove the connection is useful.
- `purpose` and `trigger` are optional prose for maintainers and generated-skill instructions. `trigger` is especially important for `load: on-demand` references.

`load: never` is deliberately omitted. Non-operational graph links stay in `related_notes`; once a reference appears in `references`, casting and validation should treat it as operational.

#### Reference evidence

Reference connections can be exploratory without hiding that uncertainty:

- `hypothesis` — added because it seems useful; not yet proven by a real cast run. Requires `verification`.
- `corpus-observed` — grounded in survey or research over real workflows, upstream source, or runtime behavior.
- `cast-validated` — a generated skill used this reference successfully on real data.

This lets maintainers add promising references while preserving an implicit TODO: run the generated skill on real-world data and promote or remove the connection based on the result.

The controlled vocabulary, labels, descriptions, and help links for `kind`, `used_at`, `load`, `mode`, and `evidence` live in `reference_contract.yml`. Validation and site rendering both read that registry.

### Agent-facing vs. human-facing vendored artifacts

When an upstream project ships *both* a structured source (YAML, JSON Schema, IDL) *and* a derived human-rendered form (LaTeX-heavy Markdown, generated HTML), **cast from the structured source, not the rendered form.** The structured source is denser per token, schema-regular, and preserves identifiers (labels, test pin names) that the renderer typically discards.

Canonical example: [[galaxy-collection-semantics]]. Upstream (`galaxyproject/galaxy`) keeps the formal type-rule spec in `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` and runs `semantics.py` to generate `doc/source/dev/collection_semantics.md` (MyST admonitions + LaTeX math). The Foundry vendors **both** at the same SHA:

- `content/research/galaxy-collection-semantics.yml` — canonical for casting and for any agent reasoning about collection mapping/reduction. Carries `tests:` blocks pinning concrete Galaxy test names that the rendered MD drops.
- `content/research/galaxy-collection-semantics.upstream.md` — vendored solely so the site can render the upstream view for human readers. Not consumed by casting.

Casting policy: a cast that needs collection-semantics knowledge resolves the `.yml` and inlines/condenses from there; the rendered `.md` is a site-rendering concern only. Pattern generalizes — when both forms exist, agents read structure, humans read prose.

The casting process is itself expected to evolve. Today: an LLM with a target-specific prompt for the condensation steps; deterministic file copies for the rest. Tomorrow: maybe smarter prompts, different models per kind, partial determinism within a kind. The Foundry does not lock in a casting algorithm; it locks in a **contract** (input shape, output shape, provenance).

## When casting runs

Three triggers, in increasing automation:

1. **Manual.** `foundry cast <mold-name> --target=<target>`. The default for v1. A maintainer runs this when a Mold has changed and they want to see the new cast.
2. **CI on Mold change.** When a PR touches `molds/<name>/`, CI re-casts that Mold against all configured targets and surfaces the diff in review.
3. **Watch-on-change** (dev convenience). `foundry cast --watch` re-casts on file change for tight iteration.

`foundry status` reports drift: which casts in `casts/<target>/<name>/` were produced from a different Mold content hash than what's currently on disk.

## Input contract

To cast a Mold, the casting process consumes:

- **The Mold directory** — `index.md` (frontmatter manifest + procedural body) plus, if the schema permits, casting hints. **Not** `eval.md` — evals stay in the Foundry.
- **All typed references declared in the manifest**, resolved by kind:
  - `references` — object-shaped typed references with `kind`, `ref`, `used_at`, `load`, and `mode`; this is the preferred manifest for new operational references.
  - `patterns` — legacy wiki links into `content/patterns/`.
  - `cli_commands` — legacy wiki links into `content/cli/<tool>/<cmd>.md`.
  - `input_schemas` / `output_schemas` — paths into `content/schemas/`.
  - `prompts` — legacy wiki links into `content/prompts/` (when the Mold needs them).
  - `examples` — legacy paths into `content/molds/<slug>/examples/` or shared `content/examples/`.
  - IWC exemplar URLs cited in pattern bodies are resolved by the pattern transformation, not by the casting top-level (URLs stay URLs in pattern bodies; pinning to a SHA is at the pattern author's discretion).
  - Other Molds (`related_molds`) — flagged as a smell; see Open questions.
- **The cast target spec** — a per-target adapter (prompt templates per kind + output structure) declared in `casts/<target>/_target.yml`.
- **A casting model and prompt version** — recorded in provenance.

Resolution policy is per-kind, not a single rule:
- `pattern` — verbatim inline if under a size threshold; LLM-summarize otherwise. Casting hints (`inline: true` / `summarize: true`) may override.
- `cli-command` — always cast to JSON sidecar (deterministic structuring; no token-budget condensation needed because the sidecar is loaded only when the agent needs that command).
- `schema`, `example`, `prompt` — always verbatim copy unless the typed reference declares a future supported transformation.
- `research` — operational background; copied or condensed according to `mode`, and loaded according to `used_at` / `load`. `mode: condense` is specified but not implemented in v1 tooling yet.
- `eval` — never packaged.

## Output contract

Per cast: `casts/<target>/<mold-name>/`. Layout depends on target.

For the **Claude target**:
```
casts/claude/<mold-name>/
├── SKILL.md                  # the skill body Claude loads
├── references/               # supporting content, organized by kind
│   ├── schemas/              # verbatim *.schema.json
│   ├── cli/                  # JSON sidecars cast from manpages
│   │   └── <tool>/<cmd>.json
│   ├── patterns/             # condensed pattern excerpts (when not fully inlined)
│   ├── notes/                # research notes or condensed operational excerpts
│   ├── prompts/              # verbatim prompt fragments (when not fully inlined)
│   └── examples/             # verbatim fixtures
└── _provenance.json          # required, not part of the skill
```

Per-kind subdirectories under `references/` mirror the casting dispatch and let the generated skill's runtime locate any artifact deterministically.

For the **web target** (sketch):
```
casts/web/<mold-name>/
├── skill.json                # structured skill description
├── prompt.md
└── _provenance.json
```

For **generic**: shape TBD; probably a single self-contained markdown.

`_provenance.json` is required for every cast and contains:

```json
{
  "mold_name": "implement-galaxy-tool-step",
  "mold_content_hash": "<sha256 of mold.md>",
  "mold_commit": "<git SHA at cast time>",
  "casting_model": "claude-opus-4-7",
  "casting_prompt_version": "v3",
  "casting_target": "claude",
  "cast_at": "2026-04-29T20:15:00Z",
  "resolved_refs": [
    { "kind": "pattern",     "name": "galaxy-collection-manipulation", "hash": "<sha256>" },
    { "kind": "cli-command", "name": "gxwf/tool-search",                "hash": "<sha256>" },
    { "kind": "cli-command", "name": "gxwf/tool-versions",              "hash": "<sha256>" },
    { "kind": "schema",      "name": "summary-paper.schema.json",       "hash": "<sha256>" },
    { "kind": "example",     "name": "scatter-with-collection.gxformat2.yml", "hash": "<sha256>" }
  ]
}
```

Provenance is the foundation for drift detection, reproducibility audits, and "why does this cast contain X" forensics.

## Schema artifacts in casts

**The test-format schema is the canonical case.** `@galaxy-tool-util/schema` ships `tests.schema.json` (generated from `galaxy.tool_util_models.Tests` Pydantic models — see [galaxyproject/galaxy#22566](https://github.com/galaxyproject/galaxy/pull/22566) and [jmchilton/galaxy-tool-util-ts#75](https://github.com/jmchilton/galaxy-tool-util-ts/pull/75) for the source-of-truth chain). It carries every assertion's parameters, types, defaults, required fields, the `that` discriminator constant, and the original Python docstring as `description`. An agent equipped with that JSON Schema can author syntactically valid `<workflow>-tests.yml` and look up what each assertion does — no prose vocabulary catalog required.

Casting policy for upstream-package schemas:

- **Source of truth lives upstream.** The Foundry pins a version (in its toolchain `package.json` for npm, etc.) but does not edit the schema.
- **Casting copies the schema verbatim into `references/schemas/`.** The cast skill's runtime loads it for AJV / equivalent validation; no Foundry round-trip needed.
- **Bundle helper functions when applicable.** For test-format specifically, `@galaxy-tool-util/schema` also exports `validateTestsFile` and `checkTestsAgainstWorkflow` (label/type cross-check between a `.ga` and a tests file). When a cast's runtime is Node-capable, depending on the package directly is cleaner than vendoring just the JSON; the dependency is also recorded in `_provenance.json` so reviewers can see the version pin.
- **Schema-page rendering in the Foundry uses the same vendored copy.** The Foundry's site renders the schema as a navigable page (`content/schemas/<name>/`), so research notes and Mold bodies can deep-link individual `$defs` (e.g. `[[schemas/tests-format#has_text]]`). The vendored JSON is the single source for both casting output and site rendering.

Other schemas that fall under this policy as they land:

- **`gxformat2`** — workflow source format. Schema-Salad-derived; vendored similarly.
- **Mold IO summary schemas** (`summarize-paper`, `summarize-nextflow`, `summarize-cwl` outputs) — Foundry-authored under `content/schemas/`, but cast and site-rendered through the same machinery so consumers see one consistent surface.

The reference-kind `schema` does not distinguish between Foundry-authored and upstream-vendored at cast time — both are verbatim copies. The distinction matters only for sync/update flow: upstream schemas update via package bumps, Foundry-authored schemas update via direct edits.

## Process steps (per cast)

```
cast_mold(mold_name, target):
  mold     <- read molds/<mold_name>/index.md
  validate mold against frontmatter schema (incl. typed-reference manifest)
  refs     <- resolve_manifest(mold)               # by kind: references plus legacy fields
  validate every ref exists and conforms to its kind's contract
  target   <- load_target_adapter(target)

  # Per-kind dispatch:
  for ref in refs:
    case ref.kind:
      pattern      -> condensed = llm.condense(ref, target.pattern_prompt)
                      stash for SKILL.md inlining or write to references/patterns/
      cli-command  -> sidecar = llm.cast_manpage_to_json(ref, target.cli_prompt)
                      write to references/cli/<tool>/<cmd>.json
      schema       -> copy verbatim to references/schemas/
      research     -> copy verbatim or condense to references/notes/ per mode
      prompt       -> copy verbatim (inlined or to references/prompts/)
      example      -> copy verbatim to references/examples/
      eval         -> skip

  skill_md  <- target.assemble_skill(mold.body, condensed_patterns, manifest)
  write SKILL.md to casts/<target>/<mold_name>/
  write _provenance.json (mold hash, model(s), prompt version(s), per-ref hashes, timestamp)
```

The LLM is invoked per kind that needs condensation, not once globally. Streaming, retries, and per-kind output validation (does the JSON sidecar parse? does the condensed pattern preserve required sections?) live in the per-kind handler. If any handler fails, the cast aborts and the previous cast on disk is unchanged.

## Drift detection

A cast is **stale** when any of:
- The Mold's `mold.md` content hash differs from `_provenance.mold_content_hash`.
- Any resolved ref's content hash differs from the recorded `resolved_refs[*].hash`.
- The target adapter (prompt version) has changed.
- The casting model has changed (and we want to re-cast against the new model).

`foundry status` enumerates stale casts; `foundry cast --all` re-casts every stale entry. Re-casting against an unchanged Mold and unchanged refs with the same model produces a different artifact because the LLM is non-deterministic — that's expected and reviewed via diff.

## Versioning

**No semver on Molds, no semver on casts.** Identity is content hash + commit SHA. Re-casting is the migration path. If a cast skill needs to be "frozen" (e.g., a published skill on a marketplace), pin it by commit SHA in the consumer.

This keeps the Foundry's iteration loop fast: change a Mold, re-cast, review the diff. Don't bump versions, don't manage compatibility tables, don't write changelogs for every cast.

## Reproducibility

Casting is **non-deterministic** (LLM). What we guarantee instead is **traceability**: every cast records exactly what went into it (Mold hash, ref hashes, model, prompt version). A reviewer can:

- Check whether a cast is up-to-date (drift detection).
- Reproduce the *inputs* to a cast (clone the repo at the recorded commit SHA, re-cast).
- Compare two casts' provenance to explain content differences.

We do not guarantee that re-casting produces byte-identical output. We do guarantee that re-casting produces output derivable from the same inputs.

## What casting does *not* do

- **Does not write to the Foundry.** Casting is read-only against `content/molds/`, `content/patterns/`, `content/cli/`, `content/prompts/`, `content/examples/`, and `content/schemas/`. All writes go to `casts/`.
- **Does not invoke gxwf or Planemo.** Those are the cast skill's responsibility at runtime, not casting time. (Validation tooling does invoke schemas, but that's distinct.)
- **Does not update Molds.** If casting reveals a Mold is wrong, that's a hand edit by the maintainer.
- **Does not touch eval plans.** `eval.md` is Foundry-only; never read by casting.

## v1 minimum

To exercise the architecture without overbuilding:

- One cast target: **Claude**. Web and generic deferred.
- One casting model: pick one, pin in `casts/claude/_target.yml`.
- Cast 3-4 Molds end-to-end: `summarize-paper` (exercises `schema` + `pattern`), `implement-galaxy-tool-step` (exercises `pattern` + `example`), `validate-galaxy-step` (exercises `cli-command` reference from an action Mold), `validate-galaxy-workflow` (exercises terminal validation posture). Diversity exercises the per-kind dispatch, not just the prompt.
- Manual `foundry cast` only — no CI, no watch.
- Commit casts to the repo so we can review the actual outputs.

If those casts look reasonable and the provenance flow holds, scale to more Molds and more targets.

## Open questions

- **Casting prompt granularity.** Per-kind prompts are baseline (pattern-condense vs. manpage-to-JSON vs. skill-assembly are different jobs). Open: do action Molds vs. analytical Molds want different *skill-assembly* prompts? v1: one skill-assembly prompt per target; refactor when one prompt no longer fits.
- **Recursive casting depth.** If Mold A wiki-links Mold B (`related_molds`), do we resolve B's content into A's cast, or just summarize that B exists? v1: surface as a smell, allow but warn. The intended escape valve for "two Molds need shared content" is to factor that content into a **pattern page, CLI manual page, prompt fragment, or schema** — kinds that already have casting transformations — not a Mold-to-Mold link. Revisit if a legitimate Mold-to-Mold need surfaces.
- **Caching ref resolution.** Re-resolving every wiki link every cast is wasteful at scale. v1: no cache. Add when casting count makes it noticeable.
- **Cast diff hygiene.** LLM output is noisy; casts will produce churny diffs even on small Mold edits. Consider an output-stabilization pass (deterministic re-formatting). Defer until churn becomes painful.
- **Multi-target casts in one run.** `foundry cast <mold-name>` (no `--target`) — cast to all configured targets in parallel? v1: explicit `--target` required.

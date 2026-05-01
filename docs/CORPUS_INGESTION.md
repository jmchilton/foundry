# Initial IWC Integration

(Filename retained as `CORPUS_INGESTION.md` for continuity, but "ingestion" overstates what survives. After deconstruction, the Foundry has **no IWC ingestion pipeline, no exemplar mirror, and no `workflow-fixtures` runtime dependency**. This document describes the lighter integration that replaces the earlier sketch.)

## What changed and why

Earlier sketch: ingest `gxformat2`-cleaned IWC workflows from `workflow-fixtures/` into per-workflow exemplar pages with auto-generated structural metadata (step counts, tool lists, test fixtures) and hand-curated annotations preserved across re-ingestion.

Problem: the unique value per exemplar page is the hand-curated `## Patterns demonstrated` cross-reference. Everything else (step count, tool list, has_tests, the auto-generated Steps body) is just re-rendering of upstream `.gxwf.yml` content. The `<!-- foundry:hand-curated -->` markers, idempotent regeneration, drift warnings, and structural-change detection are a lot of machinery to protect a paragraph of hand-written cross-reference per workflow.

`workflow-fixtures` was R&D scratch for pattern-research. Treating it as Foundry-runtime input recreates the "we mirror IWC" problem in lighter clothing. Agents have `gxwf` and can clean / inspect IWC directly. Foundry contributors can use `workflow-fixtures` locally as an authoring aid without the Foundry depending on it.

`workflow-fixtures/` now lives as a top-level directory inside the Foundry checkout (Foundry support infrastructure, not a separate product). Generated corpora — `pipelines/`, `iwc-src/`, `iwc-cleaned/`, `iwc-format2/`, `iwc-skeletons/` — are gitignored. The validator and site-content traversal stay scoped to `content/`; `workflow-fixtures/` is invisible to them. The directory is cited by `$IWC_FORMAT2/...` and `$IWC_SKELETONS/...` from authoring/survey notes; nothing in `casts/` or `content/` reads from it at build time.

## Skeleton tier

Survey-time evidence has three tiers:

1. **Grep** over `$IWC_FORMAT2/**/*.gxwf.yml` — cheap, blind to step-pair / step-sequence patterns.
2. **Skeleton scan** over `$IWC_SKELETONS/**/*.gxwf.yml` — cheap structural read; sees topology, control flow, and tool sequences. All 120 skeletons fit in agent context (median ~6KB, total ~1MB).
3. **Whole-workflow reading** of selective `$IWC_FORMAT2` files — expensive; reserved for parameter-level evidence on the recipes that look promising from tier 1 or 2.

A skeleton is the format2 workflow with non-structural fields stripped, leaving:

- `tool_id`, `label`, `doc` per step
- `in:` (with `source:`) / `out:` (ids only) / `step_inputs` topology
- `when:` expressions and other control flow
- `run:` subworkflow descents (recursive)
- workflow-level `inputs:` / `outputs:` / `tags` / `release` / `license`

Dropped: `tool_state` parameter blobs, step `position:` UI metadata, step-level `comments:` / `uuid` / `tool_shed_repository` / `tool_version` (redundant with `tool_id`), output post-processing fields (`add_tags`, `change_datatype`, `hide`, `rename`, …), and top-level `comments:` (Galaxy sticky-notes, not topology).

Regen: `cd workflow-fixtures && make skeletons` (or `tsx workflow-fixtures/scripts/build-skeletons.ts`). Idempotent — rebuilds `iwc-skeletons/` from the current `iwc-format2/`. Re-run after `make iwc` bumps the IWC pin.

The pattern is **skeletons + selective full reads**, not skeletons replacing full reads. `/iwc-survey` defaults to "skeleton scan first, then drill into `$IWC_FORMAT2`" for workflow-shape topics; tool-level topics still lean grep + structured-block extraction.

## What the Foundry does instead

1. **Patterns cite IWC by URL, in the page body.** A pattern's `## Exemplars` section lists IWC workflows that demonstrate it, each as a free-form Markdown link (`[bacterial-genomics/...](https://github.com/galaxyproject/iwc/blob/<sha>/workflows/...)`) with one-liner author commentary. Pin to a specific commit SHA when stability matters; pin to `main` when freshness matters. Author choice per citation; no enforced policy.

2. **Inline excerpts when they earn it.** A pattern author may paste 10–30 lines of cleaned `gxformat2` directly into a pattern body to illustrate an idiom. The cleaning is done **at authoring time** by the human running `gxwf` locally (probably against `workflow-fixtures`, or against a fresh clone, or against a raw IWC URL — the Foundry doesn't care). The excerpt is committed verbatim into the pattern page; no build-time regeneration; rot is rot.

3. **`iwc/*` tag family for category aggregation.** Patterns (and Molds, when applicable) carry one or more `iwc/<category>` tags. The category vocabulary lives in `meta_tags.yml`, hand-maintained, seeded by a one-time inventory of current IWC categories.

4. **Per-category aggregation surfaces** come from the tag system:
   - The standard `tags/iwc/<category>` page (free, falls out of `tags/[...tag].astro`) lists all patterns + Molds tagged that way.
   - A generated `content/iwc-overview.md` (`--check`-gated) groups every `iwc/*` tag in a single dashboard with counts and a one-line description per category. Single landing page for "what does the Foundry have for variant-calling, RNA-seq, …".
   - A new `dashboard_sections.json` block surfaces an "IWC Coverage" section on the main dashboard.

5. **`compare-against-iwc-exemplar` (the Mold) operates against live IWC.** The cast skill loads with instructions to fetch IWC at runtime via `WebFetch` / `gxwf`, not against Foundry-hosted exemplar pages. The Mold's source artifact describes the *procedure*, not a corpus index.

## What this gives up

- **Per-workflow inverse view** ("which Foundry patterns does this specific IWC workflow demonstrate"). No structural support. To recover, an author can hand-write a `concept` note for a particularly canonical workflow and wiki-link to it. By exception, not by structural rule.
- **Per-workflow tag-page browsing in the static site.** Replaced by per-category browsing.
- **Build-time inlining of full workflow content into casts.** Casts that need workflow detail get IWC URLs the agent fetches at runtime, or the small hand-curated excerpts on pattern pages.
- **Auto-detection of upstream IWC structural drift.** A cited workflow can change shape without tripping any Foundry signal. Mitigation: pin citations to commit SHAs where stability matters; rely on review when authoring patterns.

## `iwc/*` vocabulary

Hand-maintained in `meta_tags.yml`. Seeded once by inventorying IWC categories. Add as needed when a new pattern lands; never auto-synced.

**Source of truth: top-level directories under `~/projects/repositories/iwc/workflows/`.** Each is a science-domain category. Slugs are normalized to lowercase + dashes (`bacterial_genomics` → `iwc/bacterial-genomics`). Per-`.ga` `tags` fields exist for finer labels (e.g., `mpvx`, `generic`) but are *not* the categorization spine — they may inform a finer tag tier later if needed; not in v1.

Concrete seed (as of `iwc@<seed-commit-sha>`):

```yaml
iwc/amplicon:
  description: "Amplicon sequencing analysis"
iwc/bacterial-genomics:
  description: "Bacterial genome analysis"
iwc/comparative-genomics:
  description: "Comparative-genomics workflows"
iwc/computational-chemistry:
  description: "Computational-chemistry workflows"
iwc/data-fetching:
  description: "Data-acquisition and fetching workflows"
iwc/epigenetics:
  description: "Epigenetics (ChIP-seq, ATAC-seq, methylation, …)"
iwc/genome-annotation:
  description: "Genome-annotation workflows"
iwc/genome-assembly:
  description: "Genome-assembly workflows"
iwc/imaging:
  description: "Image-analysis workflows"
iwc/metabolomics:
  description: "Metabolomics workflows"
iwc/microbiome:
  description: "Microbiome / metagenomics workflows"
iwc/proteomics:
  description: "Proteomics workflows"
iwc/read-preprocessing:
  description: "Read pre-processing (trimming, filtering, QC)"
iwc/repeatmasking:
  description: "Repeat-masking workflows"
iwc/sars-cov-2-variant-calling:
  description: "SARS-CoV-2 variant calling"
iwc/scrnaseq:
  description: "Single-cell RNA-seq workflows"
iwc/transcriptomics:
  description: "Bulk RNA-seq / transcriptomics workflows"
iwc/variant-calling:
  description: "Variant-calling workflows (DNA-seq, somatic, germline)"
iwc/vgp-assembly:
  description: "VGP (Vertebrate Genomes Project) assembly workflows"
iwc/virology:
  description: "Virology / viral-genomics workflows"
```

A one-time `tsx scripts/seed-iwc-tags.ts` script reads `<iwc-clone>/workflows/`, emits this YAML block. Not idempotent in the sense of re-syncing on demand — re-running it generates a candidate patch the maintainer applies by hand to `meta_tags.yml`. After v1 seeding, vocabulary churn (rare) is hand-edited.

**Cross-cutting cases worth a note for v1 seeding:**

- `iwc/sars-cov-2-variant-calling` is both viral and variant-calling. Patterns for it can carry multiple `iwc/*` tags (`iwc/sars-cov-2-variant-calling` + `iwc/virology` + `iwc/variant-calling`). Multi-tagging is a feature, not a smell — the aggregation pages all show the same pattern under each relevant heading.
- `iwc/data-fetching` is tooling, not a science domain. It's a legitimate IWC category but conceptually a different tier from the rest. Tagging mixes happily; if the IWC overview page needs to group "domains" vs "tooling," do it cosmetically in the renderer, not in the vocabulary.
- `iwc/vgp-assembly` is a specific project (VGP), narrower than the others. Kept as-is to mirror IWC's directory; if it becomes a sub-category of `iwc/genome-assembly` later, alias and migrate.

## Generated `iwc-overview.md`

Auto-generated, `--check`-gated, drift detection wired into CI. Format:

```markdown
# IWC Coverage Overview

Generated from `iwc/*` tag membership across patterns and Molds. Run `npm run iwc-overview` to regenerate.

## Variant Calling (`iwc/variant-calling`)

> Variant-calling workflows (DNA-seq, somatic, germline)

Patterns:
- [[galaxy-paired-collection-vcf-merge]] — paired collection → merged VCF idiom
- [[galaxy-conditional-calling-mode]]    — somatic vs. germline branching

Molds:
- [[implement-galaxy-tool-step]]         (general; tagged for relevance)

## RNA-seq (`iwc/rna-seq`)

> RNA-seq quantification, splicing, differential expression

Patterns:
- [[galaxy-tabular-counts-pivot]]        — STAR/Salmon counts → tidy tabular
…
```

Counts in the dashboard surface ("Variant Calling — 4 patterns, 2 Molds") let a contributor immediately see which areas are well-covered vs thinly covered.

## Validation

The validator gains one small Foundry-specific check (replacing the earlier `validateExemplarPin` and `validateMoldRefs`):

- **`validateIwcTags`** — every `iwc/<category>` tag used in a note is declared in `meta_tags.yml`. Same enforcement as the existing tag-coherence pipeline; no new mechanism.

That's the entirety of "IWC integration" enforcement. Citations in pattern bodies are not validated (URLs are URLs; the cost of brokenness is moderate, the cost of automated link-check at scale is real).

## What lives where (summary)

- **In the Foundry repo:** patterns (with IWC citations + optional excerpts in body), Molds (some tagged `iwc/*`), `meta_tags.yml` (with the `iwc/*` vocabulary), `iwc-overview.md` generated index.
- **NOT in the Foundry repo:** workflow-fixtures, exemplar pages, `_pin.txt`, ingest scripts, hand-curated annotation markers, frontmatter schema for `exemplar` notes.
- **In the user's home:** workflow-fixtures stays where it is, used as an authoring aid by humans cleaning excerpts. No reference from Foundry tooling.

## v1 minimum

To exercise this lighter integration:

1. Seed `iwc/*` categories in `meta_tags.yml` (one-time scrape or hand-typed).
2. Author 2–3 patterns end-to-end with `## Exemplars` sections citing IWC URLs and one inline excerpt.
3. Wire the `iwc-overview.md` generator + `--check` drift gate.
4. Confirm a Mold can wiki-link a tagged pattern and that casting resolves the citations as live URLs (not as embedded mirrors).

If the loop holds, scale to more patterns. No further integration tooling planned for v1.

## Open questions

- **Stale citation detection.** Pin-to-SHA citations rot silently when IWC moves files. Worth a periodic `tsx scripts/check-citations.ts` that verifies each cited URL still resolves (HEAD request)? Cheap, but adds a CI dependency on network. Defer unless rot becomes visible.
- ~~**`iwc/*` seed source of truth.**~~ Resolved: top-level directories under `<iwc-clone>/workflows/`, slugified. See vocabulary section above.
- **Inline excerpts in pattern bodies — typeset how?** Plain fenced Markdown with `gxformat2` as the language hint, or a custom directive? Plain fenced is simplest; revisit if syntax highlighting matters.
- **`compare-against-iwc-exemplar` Mold's discovery mechanism.** Without a Foundry-hosted exemplar index, how does the cast skill find candidate exemplars to compare against? Probably via IWC's own listing (URL TBD) plus `gxwf` tooling. The Mold's `eval.md` will need to specify this; not blocking for the Foundry's architecture.

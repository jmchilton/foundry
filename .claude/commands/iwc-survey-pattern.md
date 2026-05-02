---
description: Draft one Foundry pattern page from an IWC survey candidate without turning the survey into a rigid template.
argument-hint: "<survey-path> <operation-slug>  e.g. content/research/iwc-tabular-operations-survey.md tabular-sql-query"
---

# Draft one pattern page from a survey: `$1` `$2`

Write or refine exactly one pattern page under `content/patterns/` from a surveyed candidate. Keep the page operation-first, corpus-grounded, and useful to a cast skill. Do not author a batch unless the user asks.

## Load context first

1. **`content/glossary.md`** — pinned Foundry vocabulary.
2. **`CLAUDE.md`** — local authoring rules.
3. **`docs/PATTERNS.md`** — operation-anchored naming, corpus-first rule, legacy-tool posture.
4. **`docs/ARCHITECTURE.md`** §3, §5, §6 — note types, frontmatter, validation.
5. **`meta_schema.yml`** + **`meta_tags.yml`** — frontmatter contract and tags.
6. **`common_paths.yml.sample`** — citation prefix vocabulary; use `$IWC_FORMAT2/path:line` citations.
7. **The survey at `$1`** — especially the candidate boundary, decisions, and open-question resolution relevant to `$2`.

## Find style comparators without loading everything

Do not read every `content/patterns/*.md` file by default.

1. Use `Glob` for `content/patterns/*.md` to see names.
2. Pick the 1-2 closest comparators by operation name, shared tool family, or known decision boundary.
3. If no obvious comparator exists, load one high-signal pattern from the same broad family and one general mature page.
4. If comparator choice is ambiguous or could bias the page, ask one short clarification question before drafting.

Examples:
- A SQL tabular page should compare against nearby tabular pages such as `tabular-compute-new-column` or `tabular-join-on-key`.
- An awk recipe should compare against another operation-named awk recipe if one exists, not every awk-related page.
- A collection-tabular bridge should compare against the closest bridge page and one ordinary tabular page.

## Decide the page identity

- Filename and title are operation-anchored. Tool names belong in `## Tool`, not the slug, unless the operation is inseparable from one named Galaxy primitive.
- Use `aliases` for old survey candidate names, tool-anchored names, or terms users are likely to search for.
- If `$2` looks like a typo or an outlier against `docs/PATTERNS.md`, the survey, or nearby slugs, stop and ask. Recommend the correction.

## Page shape

Use these sections as a flexible house style, not a hard template:

- `## Tool` — recommended tool or recipe mechanism; include version posture only when it matters.
- `## When to reach for it` — scope and 1-3 nearby “do not use this when...” boundaries.
- `## Parameters` — authoring-relevant fields and sharp YAML shape facts, not full tool documentation.
- `## Idiomatic shapes` — corpus-shaped YAML or compact snippets.
- `## Pitfalls` — concrete silent failures and correctness traps.
- `## Exemplars (IWC)` — `$IWC_FORMAT2/path:line` citations with why each exemplar matters.
- `## Legacy alternative` — optional. Include only when there is a real legacy/read-support/migration point.
- `## See also` — related survey, close sibling pages, and decision-boundary pages.

Drop sections that do not earn their space. A thin “None surfaced” legacy section is worse than no section.

## Frontmatter guidance

- Required fields must conform to `meta_schema.yml`; do not add ad-hoc fields.
- `summary` is a compressed “what to do and when” line, not a mini abstract.
- `related_notes` should name primary source notes only, usually the survey. Put secondary context notes in body or `See also` unless they are essential source material.
- `related_patterns` should be focused: pages that decide against this one, close siblings, or immediate follow-ups. Do not list the whole neighborhood.
- `related_molds` usually includes `[[implement-galaxy-tool-step]]` when the page guides Galaxy step authoring.

## Evidence and tone

- The survey is the audit trail; the pattern page is the actionable reference.
- Preserve pinned decisions from the survey. If a decision looks wrong, surface it as a question; do not silently override it.
- Cite corpus examples tightly. Prefer 2-4 exemplars that teach distinct shapes over citation density.
- Prefer concrete prescriptive language where the corpus justifies it: “set `one_header: true` when...” not “consider headers.”
- Avoid speculative capabilities. No IWC exemplar means no pattern page.

## Validation

After writing or editing the page:

1. Run `npm run validate`.
2. Fix schema, tag, and broken-link errors. Do not weaken the schema to pass.
3. Warnings can remain if they are known backlink advisories; report them explicitly.

## Report back

Summarize:

- Page written/refined.
- Main operation boundary.
- Comparator pages used.
- Validation result.
- Any unresolved naming or evidence questions.

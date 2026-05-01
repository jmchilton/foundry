---
description: Walk an IWC survey's findings interactively, land anti-pattern calls inline, and open GitHub issues for new/refined pattern pages. Does not author the pages.
argument-hint: "<path-to-survey-note>  e.g. content/research/iwc-collections-survey.md"
---

# Act on an IWC survey: `$1`

Read survey `$1` and walk its findings with the user via `AskUserQuestion`. Land "don't endorse" calls **inline** in the anti-pattern note as you go. Open GitHub issues for new pattern pages to write and existing pages to refine. **Do not author or edit pattern pages here** — that's a separate task with fresh eyes.

## Load context first (in order)

1. **`content/glossary.md`** — pinned vocabulary.
2. **`docs/PATTERNS.md`** — authorship policy. Operation-anchored naming is mandatory; corpus-first is mandatory; legacy-tool footnote convention is mandatory.
3. **`docs/ARCHITECTURE.md`** §3 (note types).
4. **`common_paths.yml.sample`** — citation prefix vocabulary for any new entries you write.
5. **`content/research/iwc-shortcuts-anti-patterns.md`** — the live anti-pattern note. You will edit this inline. Read its full current state so additions match its shape and tone.
6. **All existing pattern pages** under `content/patterns/` — title, scope, related links. Anything already covered by an existing page is *not* a "create new" candidate; at most a "refine existing" candidate.
7. **The survey at `$1`** — full read.
8. **The survey's `related_notes`** — for cross-cutting context.

## Pre-flight: dedupe against prior knowledge

Before asking the user anything, suppress questions covered by prior answers:

- Any candidate pattern whose scope overlaps an existing `content/patterns/*.md` page → reclassify as "refine existing," not "create new."
- Any idiom or tool already called out in `iwc-shortcuts-anti-patterns.md` → do not re-surface as a recommendation candidate; cite the existing entry instead.
- Any naming-axis question (operation vs tool vs shape) → do not ask; `docs/PATTERNS.md` decides. Use operation-anchored names.
- Any "should we write a speculative page for this gap" question → do not ask; corpus-first decides. Document the gap, no page.

If the dedupe pass empties the candidate list, post a debrief saying so and stop.

## Walk the findings

Use `AskUserQuestion` for each decision point, **batched in groups of 3-5 questions per round** to keep the user in flow. Group by kind:

### Round 1 — Open questions from the survey

The survey ends at numbered open questions. Walk them. Each question's answer either:

- Resolves a redundancy / posture / scope call → record the answer for issue-body context (no file edits yet).
- Names something as an anti-pattern → **edit `iwc-shortcuts-anti-patterns.md` inline now**, before moving on. Add a short entry: tool/idiom name, the call ("don't endorse" / "legacy alternative only" / "deprecated"), the reason in one sentence, and a corpus citation from the survey. Match the existing note's shape.

### Round 2 — Candidate pattern pages (new)

For each surveyed candidate the user marked **keep**, ask:

- Confirm operation-anchored name (propose one based on the survey; let the user rename).
- Confirm scope sketch and the 2-3 anchor citations.
- Anything to flag for the eventual author (prescriptive rules surfaced in the survey, foot-guns, recommended-default tuples).

Collect into an issue draft per pattern. Do not open issues yet.

### Round 3 — Existing pattern refinements

For each existing pattern page the survey turned up new evidence for:

- What changed (new idiom, new corpus citation, deprecated parameter, version-pin sprawl, …).
- Whether the change is "add a section" or "rework the recommendation."

Collect into a single refinements issue or one issue per page — your judgment based on coupling. Do not open issues yet.

### Round 4 — Anti-pattern note review

Show the user the diff of edits you made to `iwc-shortcuts-anti-patterns.md` during the walk. Confirm or revise. This is the only writeback you do during the interview.

## Open the issues

After the walk is complete and the anti-pattern diff is confirmed:

1. **Per new pattern** — `gh issue create` with title `Pattern: <operation-anchored-name>`, body containing scope, anchor citations, prescriptive-rule notes, and a link to the survey section that motivated it.
2. **Per refinement** — `gh issue create` with title `Refine pattern: <existing-name>`, body containing what to change, evidence, and survey section link.
3. Use `gh` directly via Bash. Pass bodies via `--body-file` or HEREDOC. Label appropriately if labels exist (`gh label list` to check).

Issue-body skeleton (adapt per topic; this is a starting shape, not a template to follow rigidly):

```
## Source
Survey: <path>#<section-anchor>

## Scope
<one paragraph>

## Anchor citations
- `$IWC_FORMAT2/path:line`
- ...

## Prescriptive rules surfaced
<bullets, or "none surfaced">

## Notes for the author
<anything the user flagged in the walk>
```

## Commit the anti-pattern note

After issues are open:

- `git add content/research/iwc-shortcuts-anti-patterns.md`
- Commit with a message naming the survey and listing the additions in one line each.
- Do **not** push; let the user review and push.

## Debrief

Post a final summary:

- Anti-pattern entries landed inline (count + one-line each).
- Issues opened (count + URLs).
- Open questions from the survey that were resolved without a file change (briefly).
- Anything you suppressed in the dedupe pass (count, with brief reasons).

## What this command does **not** do

- Author or edit pattern pages under `content/patterns/`.
- Decide naming axis, corpus-first stance, or any policy already pinned in `docs/PATTERNS.md`.
- Push commits.
- Re-run the survey or update its citations.

The split is deliberate: surveying, deciding, and authoring are three different tasks with three different optimal contexts.

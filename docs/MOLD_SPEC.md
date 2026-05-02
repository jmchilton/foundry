# Mold Spec

This document is the source-layout contract for Mold authoring. `meta_schema.yml` remains the frontmatter schema, and `reference_contract.yml` remains the controlled vocabulary for typed references.

## Source Layout

A Mold source unit is a directory under `content/molds/<slug>/`.

Required files:

- `index.md` — the only frontmatter-bearing Mold source file.
- `eval.md` — Foundry-maintainer evaluation plan, not included in cast artifacts.

Optional files:

- `examples/` — local examples or small fixtures referenced by `index.md` or `eval.md`.

Non-`index.md` Markdown files inside a Mold directory must not contain frontmatter. If a supporting note needs frontmatter, move it to the appropriate content collection and reference it from the Mold.

## Index Contract

`index.md` owns the Mold page and the casting manifest.

It must declare:

- `type: mold`
- `name`
- `axis`
- `source`, `target`, or `tool` when required by the selected axis
- `references:` entries for operational dependencies

Legacy top-level fields such as `patterns`, `cli_commands`, `prompts`, and `examples` remain supported during migration. New operational dependencies should use `references:`.

## Eval Contract

`eval.md` describes how maintainers judge a cast artifact from the Mold. It is not runtime reference content.

Each eval file should include at least one case section:

```markdown
## Case: short-name

- check: deterministic
- fixture: path or corpus citation
- expectation: observable pass/fail condition
```

Use `deterministic` for checks that can be run mechanically, and `llm-judged` for qualitative review criteria.

## Validator Checklist

The validator should expose the same facts a UI Mold-health panel needs:

- Mold directory exists.
- `index.md` exists.
- only `index.md` has Mold frontmatter.
- frontmatter validates.
- axis/source/target/tool fields are coherent.
- `references:` entries resolve by kind.
- `load: on-demand` refs have triggers.
- `evidence: hypothesis` refs have verification.
- CLI command refs resolve to `type: cli-command` notes.
- CLI command notes include install, synopsis, output, exit-code, example, and gotcha/failure guidance.
- `eval.md` exists.
- `eval.md` declares at least one evaluation case.
- eval cases identify deterministic vs LLM-judged checks.
- referenced example files exist.
- pipelines reference real Molds.
- Molds unused by any pipeline are warned unless intentionally exempt.

The site surfaces this contract in two places: each Mold page has a Mold health panel, and the Mold inventory table has a compact health column plus eval-plan coverage count.

## Deferred

- Richer `io:` object model for named inputs/outputs.
- Full cast execution/eval harness.
- Runtime Mold-to-Mold dependency graph.

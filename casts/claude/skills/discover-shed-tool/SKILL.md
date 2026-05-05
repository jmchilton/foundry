---
name: discover-shed-tool
description: Search the Galaxy Tool Shed for an existing wrapper, resolve the best candidate to a pinnable version and changeset revision, and emit a hit/weak/miss recommendation validated against references/schemas/galaxy-tool-discovery.schema.json. Use when implementing a Galaxy workflow step and deciding whether to reuse a Tool Shed wrapper or fall through to authoring a new wrapper.
---

# discover-shed-tool

Find an installable Galaxy Tool Shed wrapper for one workflow step. Emit a structured recommendation that validates against `references/schemas/galaxy-tool-discovery.schema.json` before returning.

This skill owns only the Tool Shed discovery half of the `discover-or-author` branch. On `hit`, recommend the pin. On `weak`, surface why confirmation or fallthrough is appropriate. On `miss`, fall through to wrapper authoring.

## Inputs

- Free-text `need`: what the step must do, including file formats, algorithm/tool name, container clues, version constraints, and license constraints when known.
- Optional `owner_hint`, such as `iuc` or `devteam`.
- Optional `exact_name_hint`, such as a known XML tool id.

## Method

### 1. Search

Run `gxwf tool-search` with a narrow keyword query first:

```sh
gxwf tool-search "<keywords>" --json --max-results 10
```

If `owner_hint` is present, add `--owner <owner>`. If `exact_name_hint` is present, add `--match-name`. Lowercase uncertain queries because Tool Shed tool search has case-sensitivity rough edges.

Read `references/cli/tool-search.json` when you need exact flags, output shape, or exit-code handling.

### 2. Triage Hits

Score candidates using:

- Name match: exact `toolId` / name matches are strongest; help-text-only matches are weak.
- Owner reputation: `iuc` and `devteam` are strong priors.
- Recency and stale-index risk.
- Duplicate XML ids across owners/repos.
- Deprecated or stale-looking repos.

Consult `references/notes/component-tool-shed-search.md` when results are missing, weak, duplicated, stale, or ambiguous.

### 3. Resolve Version

For the top candidate, list versions:

```sh
gxwf tool-versions <trsToolId> --json
```

Pick the newest installable version unless the step need specifies a historical version. Read `references/cli/tool-versions.json` for exact output and gotchas.

### 4. Resolve Changeset

Resolve the selected `(trsToolId, version)` to a concrete changeset:

```sh
gxwf tool-revisions <trsToolId> --tool-version <version> --latest --json
```

Use the returned `changesetRevision` for reproducible workflow pinning. Read `references/cli/tool-revisions.json` for exact output and edge cases.

### 5. Classify And Emit

Emit one recommendation object:

- `hit`: one dominant candidate with clean version and changeset resolution.
- `weak`: plausible candidate exists, but owner, match quality, duplicate wrappers, deprecation, or stale-index risk needs confirmation or fallthrough.
- `miss`: no usable wrapper after reasonable query variants.

Always include rationale and warnings. For `hit` or `weak`, include the chosen candidate and useful alternates.

Validate the final JSON with `validate-galaxy-tool-discovery` if available, or equivalent JSON Schema validation against `references/schemas/galaxy-tool-discovery.schema.json`.

## Caveats

- Tool Shed search has no EDAM, no installed-tool panel context, and stale indexes.
- Search hits do not include changeset revisions; version and changeset resolution are separate steps.
- TRS versions can dedupe multiple changesets with the same XML version; pin the newest matching changeset unless the caller specifies otherwise.
- `repo-search` is a different discovery surface. This skill searches for a tool wrapper, not a package/category.

## Reference Dispatch

- `references/schemas/galaxy-tool-discovery.schema.json` — validate the emitted recommendation.
- `references/cli/tool-search.json` — consult for search flags, JSON hit shape, and exit codes.
- `references/cli/tool-versions.json` — consult for version-list behavior and TRS id forms.
- `references/cli/tool-revisions.json` — consult for changeset resolution and pinning semantics.
- `references/notes/component-tool-shed-search.md` — consult when ranking, missing results, duplicates, stale indexes, TRS limitations, or Tool Shed API behavior affects the recommendation.

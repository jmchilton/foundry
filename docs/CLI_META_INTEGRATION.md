# CLI metadata integration

**Status: Foundry adapter wired; blocked on a follow-up package release.** The local
`galaxy-tool-util-ts` worktree exposes `@galaxy-tool-util/cli/meta`, but the published
`@galaxy-tool-util/cli` 1.1.0 package does not export the `./meta` subpath or ship `spec/` files.
Foundry now pins the package and attempts to load the metadata subpath at site build time. Until a
release exposes it, the registry remains empty and CLI notes render from their markdown bodies.

## Goal

Move `cli-command` notes from hand-authored prose tables to the same rendered-data pattern
`tests-format` uses for JSON Schemas: a thin in-repo framing stub, with synopsis, args, options, and
defaults rendered from upstream package metadata. The web view stays rich; the in-repo `.md` shrinks
to "when to use this, why it exists, and what can go wrong."

See `content/schemas/tests-format.md` for the reference shape this pattern mirrors and `site/src/lib/schema-registry.ts` for the registry shape this one mirrors.

## Upstream status

The data side is now available upstream:

- [galaxy-tool-util-ts#86](https://github.com/jmchilton/galaxy-tool-util-ts/pull/86) merged on 2026-05-01 and inverted the CLI source of truth so specs drive Commander.
- [galaxy-tool-util-ts#87](https://github.com/jmchilton/galaxy-tool-util-ts/issues/87) closed with the same change.
- `@galaxy-tool-util/cli` 1.1.0 is published, but its `exports` only include `.`. It does not expose `./meta` yet.

This document is now an activation checklist for the Foundry repo, not an upstream tracking note.

## What's already in place

- `site/src/lib/cli-registry.ts` — registry loader with the typed shape `CliCommandView`. It dynamically imports `@galaxy-tool-util/cli/meta` and falls back to `{}` when the package release does not expose that subpath.
- `site/src/components/CliCommandBody.astro` — upgraded to render synopsis / args / options / defaults / negatable / per-option anchor IDs from the registry. Falls back to "no metadata registered" banner + raw markdown body when the entry is absent, so the existing prose stubs (`content/cli/gxwf/tool-search.md`, etc.) keep rendering on `main` and on this branch.
- `site/src/lib/package-version.ts` — shared package-version lookup used by schema and CLI registries.

## Activation checklist

1. **Publish/export upstream metadata.** Release a package where `@galaxy-tool-util/cli/package.json` exports `./meta` and includes the built metadata files.
2. **Verify activation.** Run the site build and confirm `cliRegistry` contains `gxwf/validate`, `gxwf/validate-tests`, and the Tool Shed discovery commands.
3. **Convert one note end-to-end as the proof.** Pick `content/cli/gxwf/tool-revisions.md` (richest existing prose; best stress test). Drop the Synopsis / Options / Exit codes tables, keep the framing prose and the *Gotchas* / *Pairs with* sections — those are the parts the registry can't carry. Add `package` and `upstream` frontmatter fields to mirror `tests-format.md`.
4. **Decide on `package` / `upstream` frontmatter for cli-command.** The properties already exist globally in `meta_schema.yml`; decide whether CLI notes should require them once converted.
5. **Convert remaining notes.** `validate.md`, `validate-tests.md`, `tool-search.md`, `tool-versions.md`. Replace synopsis/option tables with framing-only bodies after registry-backed rendering is visible.
6. **Seed missing notes.** The metadata should cover the full surface; only Mold-referenced commands need framing notes in `content/cli/` unless a whole-program index page lands.
7. **Update `docs/COMPILATION_PIPELINE.md`.** The cli-command row already says "Cast to structured JSON sidecar"; clarify that the sidecar is sourced from registry metadata plus markdown framing, not parsed from markdown tables.
8. **Drift safety.** Once notes are converted, add a validator check: cli-command notes whose `<tool>/<command>` doesn't appear in loaded package metadata should warn (or error). Catches typos and removed-upstream commands.

## Things deliberately left out so far

- No note conversions. Without the registry populated from a published metadata subpath, converting a note loses the option tables on render. The conversions land after upstream package activation.
- No new `meta_schema.yml` fields. They land with the first note conversion so the schema change is reviewed against an example.

## Risks to track

- **Import-shape drift.** Re-read the published `@galaxy-tool-util/cli/meta` exports before wiring the registry. The consumer-facing shape should be stable, but the Foundry should bind to the package as published, not to this checklist.
- **Foundry-authored CLI surface.** If the Foundry ever needs a CLI doc for a command that doesn't exist upstream (a planned subcommand, a documentation-only flag), the registry-only path can't represent it. Solution if it comes up: framing note's body wins when no registry entry exists (already the current fallback). Don't preemptively design for this — wait until a real example appears.

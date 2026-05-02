# CLI metadata integration

**Status: ready for Foundry activation.** The upstream CLI metadata work has landed in
`@galaxy-tool-util/cli` 1.1.0. The Foundry site has the empty registry and renderer shape in
place; the remaining work is to add the package dependency, populate the registry, and convert the
first CLI note.

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
- `@galaxy-tool-util/cli` 1.1.0 is published with the metadata subpath.

This document is now an activation checklist for the Foundry repo, not an upstream tracking note.

## What's already in place

- `site/src/lib/cli-registry.ts` — empty registry with the typed shape `CliCommandView` ready to receive data.
- `site/src/components/CliCommandBody.astro` — upgraded to render synopsis / args / options / defaults / negatable / per-option anchor IDs from the registry. Falls back to "no metadata registered" banner + raw markdown body when the entry is absent, so the existing prose stubs (`content/cli/gxwf/tool-search.md`, etc.) keep rendering on `main` and on this branch.

## Activation checklist

1. **Pin the package.** Add `"@galaxy-tool-util/cli": "^1.1.0"` to `site/package.json`. Run the site package manager and commit the lockfile change.
2. **Populate the registry.** In `site/src/lib/cli-registry.ts`:
   ```ts
   import { gxwfCliMeta, galaxyToolCacheCliMeta } from '@galaxy-tool-util/cli/meta';

   function indexProgram(program: CliProgramSpec, pkg: string, version: string): Record<string, CliRegistryEntry> {
     const out: Record<string, CliRegistryEntry> = {};
     for (const c of program.commands) {
       out[`${program.name}/${c.name}`] = { command: c, package: pkg, version };
     }
     return out;
   }

   const version = readVendoredPackageVersion('@galaxy-tool-util/cli'); // copy helper from schema-registry.ts
   export const cliRegistry: Record<string, CliRegistryEntry> = {
     ...indexProgram(gxwfCliMeta, '@galaxy-tool-util/cli', version),
     ...indexProgram(galaxyToolCacheCliMeta, '@galaxy-tool-util/cli', version),
   };
   ```
   Lift `readVendoredPackageVersion` into a shared module (`site/src/lib/vendored-version.ts`) so schema-registry and cli-registry both use it — currently lives only in schema-registry.
3. **Convert one note end-to-end as the proof.** Pick `content/cli/gxwf/tool-revisions.md` (richest existing prose; best stress test). Drop the Synopsis / Options / Exit codes tables, keep the framing prose and the *Gotchas* / *Pairs with* sections — those are the parts the registry can't carry. Add `package` and `upstream` frontmatter fields to mirror `tests-format.md`.
4. **Decide on `package` / `upstream` frontmatter for cli-command.** Add to `meta_schema.yml` under the cli-command branch (these fields exist already for the `schema` type — same semantics, copy the property declarations).
5. **Convert remaining notes.** `tool-search.md`, `tool-versions.md`. Replace synopsis/option tables with framing-only bodies.
6. **Seed missing notes.** The walked metadata covers the full surface (gxwf has 19 commands, galaxy-tool-cache has 7); only 3 have framing notes today. Decide policy: framing note required for every command? Or only for commands a Mold references? Probably the latter — Mold-referenced commands get framing notes, the rest are reachable via a per-program index page that lists every registered command (parallel to `tests-format`'s "All definitions" nav).
7. **Update `docs/COMPILATION_PIPELINE.md`.** The cli-command row already says "Cast to structured JSON sidecar"; clarify that the sidecar is now sourced from the registry rather than parsed from the markdown body.
8. **Drift safety.** Once notes are converted, add a validator check: cli-command notes whose `<tool>/<command>` doesn't appear in `cliRegistry` should warn (or error). Catches typos and removed-upstream commands.

## Things deliberately left out so far

- No `package.json` change. This can now land because `@galaxy-tool-util/cli` 1.1.0 is published.
- No note conversions. Without the registry populated, converting a note loses the option tables on render. The conversions land in the activation PR alongside the registry data.
- No new `meta_schema.yml` fields. They land with the first note conversion so the schema change is reviewed against an example.

## Risks to track

- **Import-shape drift.** Re-read the published `@galaxy-tool-util/cli/meta` exports before wiring the registry. The consumer-facing shape should be stable, but the Foundry should bind to the package as published, not to this checklist.
- **Foundry-authored CLI surface.** If the Foundry ever needs a CLI doc for a command that doesn't exist upstream (a planned subcommand, a documentation-only flag), the registry-only path can't represent it. Solution if it comes up: framing note's body wins when no registry entry exists (already the current fallback). Don't preemptively design for this — wait until a real example appears.

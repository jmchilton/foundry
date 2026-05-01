// Registry of CLI command metadata, keyed by `<tool>/<command>`.
//
// Mirrors `schema-registry.ts`: in-repo CLI command notes are thin
// framing stubs; the structured data (synopsis, args, options,
// defaults) lives in the upstream package's `meta` subpath and is
// wired in here for the `CliCommandBody.astro` component to render.
//
// STATUS: WIP. The registry is intentionally empty until
// `@galaxy-tool-util/cli` ships its `./meta` subpath. See
// `docs/CLI_META_INTEGRATION.md` for the activation checklist.
//
// Once activated:
//   import { gxwfCliMeta, galaxyToolCacheCliMeta } from '@galaxy-tool-util/cli/meta';
//   const gxwf = Object.fromEntries(
//     gxwfCliMeta.commands.map(c => [`gxwf/${c.name}`, { command: c, ... }])
//   );

export interface CliCommandOption {
  flags: string;
  name: string;
  short?: string;
  description: string;
  takesArgument: boolean;
  argumentPlaceholder?: string;
  optionalArgument: boolean;
  negatable: boolean;
  defaultValue?: string | number | boolean;
}

export interface CliCommandArg {
  raw: string;
  name: string;
  required: boolean;
  variadic: boolean;
  description?: string;
}

export interface CliCommandView {
  name: string;
  fullName: string;
  description: string;
  synopsis: string;
  args: CliCommandArg[];
  options: CliCommandOption[];
}

export interface CliRegistryEntry {
  command: CliCommandView;
  /** npm package name the metadata was sourced from. */
  package: string;
  /** Resolved package version, if available. */
  version: string;
  /** URL to the upstream program definition (best-effort). */
  upstream?: string;
}

// Keyed by `<tool>/<command>`, e.g. `gxwf/validate`, `galaxy-tool-cache/add`.
// Empty until activation — see docs/CLI_META_INTEGRATION.md.
export const cliRegistry: Record<string, CliRegistryEntry> = {};

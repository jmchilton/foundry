// Registry of vendored JSON Schemas, keyed by note `name` field.
// Add a new entry when a new schema-type note lands.
//
// Each entry: { schema: <JSON Schema object>, version: <package version string> }.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { testsSchema } from '@galaxy-tool-util/schema';

// Read versions directly from node_modules — the published package's `exports`
// field doesn't expose `package.json`, and lockfile-pinning means the on-disk
// path is stable.
function readVendoredPackageVersion(packageName: string): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // here is .../site/src/lib (dev) or .../site/dist/... (build) — walk up
    // until we hit a directory that has node_modules/<package>.
    let dir = here;
    for (let i = 0; i < 6; i++) {
      const candidate = resolve(dir, 'node_modules', packageName, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf-8')) as { version?: string };
        if (pkg.version) return pkg.version;
      } catch { /* try parent */ }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch { /* fall through */ }
  return '';
}

export interface SchemaEntry {
  schema: Record<string, unknown>;
  version: string;
}

export const schemaRegistry: Record<string, SchemaEntry> = {
  'tests-format': {
    schema: testsSchema as unknown as Record<string, unknown>,
    version: readVendoredPackageVersion('@galaxy-tool-util/schema'),
  },
};

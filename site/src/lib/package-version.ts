import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function readInstalledPackageVersion(packageName: string): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    let dir = here;
    for (let i = 0; i < 8; i++) {
      const candidate = resolve(dir, 'node_modules', packageName, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf-8')) as { version?: string };
        if (pkg.version) return pkg.version;
      } catch {
        // Try parent.
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Fall through.
  }
  return '';
}

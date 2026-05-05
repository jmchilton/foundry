// Mold frontmatter still cites schema refs as `content/schemas/<base>.schema.json`
// for stability, but the JSON no longer lives there — it lives in
// `packages/<pkg>-schema/src/<base>.schema.json`. This map lets cast and validate
// resolve those refs back to the package source at build time.

const CONTENT_SCHEMA_PREFIX = "content/schemas/";

const BASENAME_TO_PACKAGE_DIR: Record<string, string> = {
  "summary-nextflow.schema.json": "packages/summary-nextflow-schema/src",
  "galaxy-tool-discovery.schema.json": "packages/galaxy-tool-discovery-schema/src",
  "tests.schema.json": "packages/tests-format-schema/src",
};

export function isContentSchemaRef(ref: string): boolean {
  return ref.startsWith(CONTENT_SCHEMA_PREFIX) && ref.endsWith(".schema.json");
}

/**
 * Map a `content/schemas/<base>.schema.json` ref to its package-source path
 * (repo-relative, posix). Returns null if the basename has no registered package.
 */
export function resolveContentSchemaRef(ref: string): string | null {
  if (!isContentSchemaRef(ref)) return null;
  const base = ref.slice(CONTENT_SCHEMA_PREFIX.length);
  const dir = BASENAME_TO_PACKAGE_DIR[base];
  if (!dir) return null;
  return `${dir}/${base}`;
}

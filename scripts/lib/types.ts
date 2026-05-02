// Shared types for the validator and tooling.

export type Frontmatter = Record<string, unknown>;

export interface FileMeta {
  /** Absolute path to the .md file. */
  path: string;
  /** Path relative to the content root, for display. */
  relPath: string;
  /** Slug used for wiki-link resolution (basename, or parent dir for directory notes). */
  slug: string;
  meta: Frontmatter;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface JsonSchema {
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: string[];
  [key: string]: unknown;
}

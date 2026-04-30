// Load meta_schema.yml + meta_tags.yml; inject tag enum at runtime.

import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import type { JsonSchema } from "./types.js";

export function loadTags(tagsPath: string): string[] {
  const data = yaml.load(readFileSync(tagsPath, "utf8")) as Record<string, unknown> | null;
  return data ? Object.keys(data) : [];
}

export function loadSchema(schemaPath: string, tags: string[]): JsonSchema {
  const schema = yaml.load(readFileSync(schemaPath, "utf8")) as JsonSchema;
  const tagItems = schema.properties?.tags?.items;
  if (tagItems) tagItems.enum = tags;
  return schema;
}

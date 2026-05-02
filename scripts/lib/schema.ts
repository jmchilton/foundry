// Load meta_schema.yml + registries; inject controlled enums at runtime.

import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import type { JsonSchema } from "./types.js";
import { contractKeys, loadReferenceContract, type ReferenceContract } from "./reference-contract.js";

export function loadTags(tagsPath: string): string[] {
  const data = yaml.load(readFileSync(tagsPath, "utf8")) as Record<string, unknown> | null;
  return data ? Object.keys(data) : [];
}

export function loadSchema(schemaPath: string, tags: string[], contract: ReferenceContract = loadReferenceContract()): JsonSchema {
  const schema = yaml.load(readFileSync(schemaPath, "utf8")) as JsonSchema;
  const tagItems = schema.properties?.tags?.items;
  if (tagItems) tagItems.enum = tags;
  injectReferenceContractEnums(schema, contract);
  return schema;
}

function injectReferenceContractEnums(schema: JsonSchema, contract: ReferenceContract): void {
  const refItems = schema.properties?.references?.items as JsonSchema | undefined;
  const props = refItems?.properties;
  if (!props) return;
  setEnum(props.kind, contractKeys(contract, "kinds"));
  setEnum(props.used_at, contractKeys(contract, "used_at"));
  setEnum(props.load, contractKeys(contract, "load"));
  setEnum(props.mode, contractKeys(contract, "modes"));
  setEnum(props.evidence, contractKeys(contract, "evidence"));
}

function setEnum(schema: unknown, values: string[]): void {
  if (!schema || typeof schema !== "object") return;
  (schema as { enum?: string[] }).enum = values;
}

// AJV-backed validator for discover-shed-tool output.
// Pure ESM; ajv/ajv-formats default-export shape requires the cast.

import type { ErrorObject, ValidateFunction } from "ajv";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import { galaxyToolDiscoverySchema } from "./galaxy-tool-discovery.schema.generated.js";

const Ajv = AjvImport as unknown as typeof AjvImport.default;
const addFormats = addFormatsImport as unknown as typeof addFormatsImport.default;

export interface GalaxyToolDiscoveryDiagnostic {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface GalaxyToolDiscoveryValidationResult {
  valid: boolean;
  errors: GalaxyToolDiscoveryDiagnostic[];
}

let validator: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (!validator) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    validator = ajv.compile(galaxyToolDiscoverySchema as object);
  }
  return validator;
}

function toDiagnostic(err: ErrorObject): GalaxyToolDiscoveryDiagnostic {
  return {
    path: err.instancePath === "" ? "(root)" : err.instancePath,
    message: err.message ?? "validation failed",
    keyword: err.keyword,
    params: (err.params ?? {}) as Record<string, unknown>,
  };
}

export function validateGalaxyToolDiscovery(data: unknown): GalaxyToolDiscoveryValidationResult {
  const validate = getValidator();
  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };
  return { valid: false, errors: (validate.errors ?? []).map(toDiagnostic) };
}

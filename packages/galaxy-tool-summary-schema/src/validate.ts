// AJV-backed validator for galaxy-tool-cache summarize manifests.
// The canonical schema's `$defs.ParsedTool` is a placeholder; before AJV compiles,
// we replace it with `parsedToolSchema` exported by `@galaxy-tool-util/schema`
// so the parsed_tool subtree is validated against the upstream contract.

import type { ErrorObject, ValidateFunction } from "ajv";
import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import { parsedToolSchema } from "@galaxy-tool-util/schema";
import { galaxyToolSummarySchema } from "./galaxy-tool-summary.schema.generated.js";

const Ajv = AjvImport as unknown as typeof AjvImport.default;
const addFormats = addFormatsImport as unknown as typeof addFormatsImport.default;

export interface GalaxyToolSummaryDiagnostic {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface GalaxyToolSummaryValidationResult {
  valid: boolean;
  errors: GalaxyToolSummaryDiagnostic[];
}

let _validator: ValidateFunction | undefined;

function buildSchema(): Record<string, unknown> {
  // Strip the upstream `$schema` declaration before inlining — `parsedToolSchema`
  // declares JSON Schema 2020-12, and embedding that subschema with a different
  // `$schema` value confuses AJV's draft inference. The keywords used in
  // `parsedToolSchema` are draft-07-compatible.
  const { $schema: _drop, ...parsedToolBody } = parsedToolSchema as unknown as Record<
    string,
    unknown
  >;
  const merged = JSON.parse(JSON.stringify(galaxyToolSummarySchema)) as {
    $defs: Record<string, unknown>;
  };
  merged.$defs.ParsedTool = parsedToolBody;
  return merged as unknown as Record<string, unknown>;
}

function getValidator(): ValidateFunction {
  if (!_validator) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    _validator = ajv.compile(buildSchema());
  }
  return _validator;
}

function toDiagnostic(err: ErrorObject): GalaxyToolSummaryDiagnostic {
  return {
    path: err.instancePath === "" ? "(root)" : err.instancePath,
    message: err.message ?? "validation failed",
    keyword: err.keyword,
    params: (err.params ?? {}) as Record<string, unknown>,
  };
}

export function validateGalaxyToolSummary(data: unknown): GalaxyToolSummaryValidationResult {
  const validate = getValidator();
  const valid = validate(data);
  if (valid) return { valid: true, errors: [] };
  return { valid: false, errors: (validate.errors ?? []).map(toDiagnostic) };
}

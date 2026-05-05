import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export { summaryNextflowSchema } from "./summary-nextflow.schema.generated.js";
export {
  validateSummary,
  type SummaryDiagnostic,
  type SummaryValidationResult,
} from "./validate.js";

function readPackagedSchema(path: string, sourcePath: string): unknown {
  const packagedUrl = new URL(path, import.meta.url);
  const schemaPath = existsSync(packagedUrl)
    ? packagedUrl
    : resolve(import.meta.dirname, "..", "..", "..", sourcePath);
  return JSON.parse(readFileSync(schemaPath, "utf8"));
}

export const nextflowParametersMetaSchema = readPackagedSchema(
  "./nextflow-parameters-meta.schema.json",
  "content/schemas/nextflow-parameters-meta.schema.json",
);
export const nfCoreModuleMetaSchema = readPackagedSchema(
  "./nf-core-module-meta.schema.json",
  "content/schemas/nf-core-module-meta.schema.json",
);
export const nfCoreSubworkflowMetaSchema = readPackagedSchema(
  "./nf-core-subworkflow-meta.schema.json",
  "content/schemas/nf-core-subworkflow-meta.schema.json",
);

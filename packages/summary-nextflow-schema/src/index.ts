import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export { summaryNextflowSchema } from "./summary-nextflow.schema.generated.js";
export {
  validateSummary,
  type SummaryDiagnostic,
  type SummaryValidationResult,
} from "./validate.js";

const repoRoot = resolve(import.meta.dirname, "..", "..", "..");

function readContentSchema(path: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
}

export const nextflowParametersMetaSchema = readContentSchema(
  "content/schemas/nextflow-parameters-meta.schema.json",
);
export const nfCoreModuleMetaSchema = readContentSchema(
  "content/schemas/nf-core-module-meta.schema.json",
);
export const nfCoreSubworkflowMetaSchema = readContentSchema(
  "content/schemas/nf-core-subworkflow-meta.schema.json",
);

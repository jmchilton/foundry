export { testsFormatSchema } from "./tests.schema.generated.js";
export {
  checkTestsAgainstWorkflow,
  extractWorkflowInputs,
  extractWorkflowOutputs,
  validateTestsFile,
  type TestFormatDiagnostic,
  type WorkflowShape,
} from "@galaxy-tool-util/schema";

import { validateTestsFile } from "@galaxy-tool-util/schema";

export type TestsFormatValidationResult = ReturnType<typeof validateTestsFile>;

export function validateTestsFormat(data: unknown): TestsFormatValidationResult {
  return validateTestsFile(data);
}

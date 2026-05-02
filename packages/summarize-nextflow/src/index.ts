import { resolveNextflowSummary } from "./resolver.js";

export { VERSION } from "./version.js";

export interface SummarizeNextflowOptions {
  profile: string;
  pin?: string;
  out?: string;
  withNextflow: boolean;
  fetchTestData: boolean;
  testDataDir?: string;
  validate: boolean;
}

export class SummarizeNextflowNotImplementedError extends Error {
  readonly exitCode = 64;

  constructor(readonly target: string) {
    super("summarize-nextflow build is not yet implemented");
    this.name = "SummarizeNextflowNotImplementedError";
  }
}

export async function buildSummary(
  pathOrUrl: string,
  options: SummarizeNextflowOptions,
): Promise<unknown> {
  if (/^https?:\/\//u.test(pathOrUrl) || options.pin) {
    throw new SummarizeNextflowNotImplementedError(pathOrUrl);
  }
  return resolveNextflowSummary(pathOrUrl, {
    profile: options.profile,
    withNextflow: options.withNextflow,
    fetchTestData: options.fetchTestData,
    testDataDir: options.testDataDir,
  });
}

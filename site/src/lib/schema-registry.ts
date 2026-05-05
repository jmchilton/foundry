// Registry of vendored JSON Schemas, keyed by note `name` field.
// Add a new entry when a new schema-type note lands.
//
// Each entry: { schema: <JSON Schema object>, version: <package version string> }.

import { testsSchema } from '@galaxy-tool-util/schema';
import galaxyToolDiscoverySchema from '../../../packages/galaxy-tool-discovery-schema/src/galaxy-tool-discovery.schema.json';
import galaxyToolDiscoverySchemaPkg from '../../../packages/galaxy-tool-discovery-schema/package.json';
import summaryNextflowSchema from '../../../packages/summary-nextflow-schema/src/summary-nextflow.schema.json';
import summaryNextflowSchemaPkg from '../../../packages/summary-nextflow-schema/package.json';
import { readInstalledPackageVersion } from './package-version';

export interface SchemaEntry {
  schema: Record<string, unknown>;
  version: string;
}

export const schemaRegistry: Record<string, SchemaEntry> = {
  'tests-format': {
    schema: testsSchema as unknown as Record<string, unknown>,
    version: readInstalledPackageVersion('@galaxy-tool-util/schema'),
  },
  'summary-nextflow': {
    schema: summaryNextflowSchema as unknown as Record<string, unknown>,
    version: (summaryNextflowSchemaPkg as { version?: string }).version ?? '',
  },
  'galaxy-tool-discovery': {
    schema: galaxyToolDiscoverySchema as unknown as Record<string, unknown>,
    version: (galaxyToolDiscoverySchemaPkg as { version?: string }).version ?? '',
  },
};

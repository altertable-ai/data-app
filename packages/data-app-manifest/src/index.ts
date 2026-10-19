/** Static data app manifest tooling for Node.js and Bun; loads the TypeScript compiler. */
export { extractDataAppManifest } from './extract.ts';
export { overrideDataAppManifest } from './override.ts';
export type {
  DataAppLiteralValue,
  DataAppManifest,
  DataAppSourcePosition,
  DataAppManifestDiagnostic,
  DataAppManifestExtraction,
} from './declaration.ts';
export type { DataAppManifestOverride } from './override.ts';

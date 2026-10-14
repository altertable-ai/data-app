/** Portable data app declarations; safe in browser and server modules. */
export { defineDataApp, dataAppTitle } from '@/src/core/config';
export type {
  DataAppConfig,
  DataAppDefinition,
  QueryDefinitions,
  QueryParameterValue,
} from '@/src/core/config';

export type {
  SourcedHierarchy,
  SourcedHierarchyLevel,
} from '@/src/core/hierarchy-source';

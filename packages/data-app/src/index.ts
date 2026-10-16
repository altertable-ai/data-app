/** Portable data app declarations; safe in browser and server modules. */
export { defineDataApp, dataAppTitle } from './core/config.ts';
export type {
  DataAppConfig,
  DataAppDefinition,
  QueryDefinitions,
  QueryParameterValue,
  QueryParameter,
  QueryValueType,
  QueryField,
  QueryProjections,
  QueryRow,
} from './core/config.ts';

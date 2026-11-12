/** Portable data app declarations; safe in browser and server modules. */
export { defineDataApp } from '../core/config.ts';
export type {
  DataAppConfig,
  DataAppDefinition,
  DataAppOperationRegistry,
  QueryDefinitions,
  QueryParameterValue,
  QueryParameter,
  QueryValueType,
  QueryField,
  QueryProjections,
  QueryRow,
} from '../core/config.ts';

export type {
  DateTimeRange,
  AbsoluteOrRelativeDateTime,
  RelativeDateTime,
  RelativeAnchor,
  RelativeOffset,
  RelativeUnit,
} from '../core/date-time-range.ts';

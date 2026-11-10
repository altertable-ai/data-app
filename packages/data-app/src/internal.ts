/** Shared implementation for the coordinated data-app packages; not an app authoring API. */
export { downloadBlob } from './client/download.ts';
export { localFrameBridge } from './client/iframe.ts';
export { createBridgeEndpoint } from './core/bridge-endpoint.ts';
export {
  type BridgeDiagnostic,
  type BridgeEventMessage,
  MAX_PENDING,
  PARENT_PARAM,
  REQUEST_TIMEOUT_MS,
  validId,
} from './core/bridge.ts';
export {
  type DataView,
  type DisplayedSnapshot,
  displayedSnapshot,
  resolveDataView,
} from './core/data-view.ts';
export {
  type DimensionFilterSettings,
  type DimensionValue,
  dimensionMemberKey,
} from './core/dimension.ts';
export { numberOperatorLabels } from './core/filters.ts';
export { invariant } from './core/invariant.ts';
export { toDataOperationFailure } from './core/operation.ts';
export {
  type DataAppPresentation,
  isDataAppPresentation,
} from './core/presentation.ts';
export {
  type DataReading,
  type MetricReading,
  type MetricValues,
} from './core/reading.ts';
export { randomUuid } from './core/uuid.ts';
export {
  type AppFilter,
  type FilterValues,
  type ChoiceOption,
  type ChoiceFilter,
  type HistoryMode,
  type MultiChoiceFilter,
  type SearchFilter,
  type FilterCollection,
  type FilterPresentation,
  choiceFilter,
  displayChoice,
  defineAppFilters,
  multiChoiceFilter,
  searchFilter,
  validateChoiceOptions,
} from './core/app-filters.ts';
export {
  RequestBodyTooLargeError,
  readRequestBody,
} from './server/request-body.ts';

export { KEY_SEPARATOR } from './core/keys.ts';

export { type CheckedFilterDeclarations } from './core/app-filters.ts';
export {
  combineOperationFilters,
  dateFilterName,
  resolveFilterInput,
  type FilterInput,
} from './core/operation-filters.ts';

export { MAX_QUERY_ROWS, type IsUnion } from './core/queries.ts';

export { facetSource, type FacetFilter } from './core/facets.ts';

export {
  createDimensionFilter,
  type DimensionSelectionFilter,
} from './core/dimension.ts';

export {
  dimensionSource,
  type SourceDimensionFilter,
} from './core/dimension-source.ts';
export { parseAppDiagnosticReport } from './core/diagnostics.ts';

export {
  dateTimeRangeFilter,
  dateTimeRangePresets,
  type DateTimeRangePreset,
  type DateTimeRangeFilter,
  type DateTimeRangeFilterOptions,
  type DateTimeRangeComparison,
  type DateTimeRangeSelection,
  type DateTimeRangeRequest,
} from './core/date-time-filter.ts';
export {
  parseDateTimeRange,
  serializeDateTimeRange,
  resolveDateTimeRange,
  formatDateTimeRange,
  formatDateTimeBound,
  parseDateTimeBound,
} from './core/date-time-range-value.ts';
export type {
  DateTimeRange,
  AbsoluteOrRelativeDateTime,
  RelativeDateTime,
} from './core/date-time-range.ts';

export { fixedUnitMilliseconds } from './core/time-units.ts';

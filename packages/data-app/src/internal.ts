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
  type DatePreset,
  type DatePresetId,
  type DateRange,
  availableDatePresets,
  inclusiveDays,
  withinBounds,
} from './core/date-range.ts';
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
  type AppVariable,
  type AppVariableValues,
  type ChoiceOption,
  type ChoiceVariable,
  type DateRangeSelection,
  type DateRangeVariable,
  type DateRangeVariableOptions,
  type HistoryMode,
  type MultiChoiceVariable,
  type SearchVariable,
  type VariableCollection,
  type VariablePresentation,
  choiceVariable,
  dateRangeVariable,
  defineAppVariables,
  multiChoiceVariable,
  searchVariable,
  validateChoiceOptions,
} from './core/variables.ts';
export {
  RequestBodyTooLargeError,
  readRequestBody,
} from './server/request-body.ts';

export { KEY_SEPARATOR } from './core/keys.ts';

export {
  type CheckedFacetContexts,
  type CheckedVariableDeclarations,
} from './core/variables.ts';

export { type IsUnion } from './core/queries.ts';

export { facetSource, type FacetVariable } from './core/facets.ts';

export {
  createDimensionFilter,
  type DimensionSelectionVariable,
} from './core/dimension.ts';

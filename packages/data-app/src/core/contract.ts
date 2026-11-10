/** Operation authoring and delivery contracts; portable across runtimes. */
export {
  parseTrue,
  defineDateRangeContract,
  parseCount,
  parseLabel,
  defineQueryNames,
  defineOperation,
  connectionCheck,
  dimensionFilter,
  parseDimensionSelection,
  parseFacetOptions,
  dimensionPredicate,
  numberFilter,
  booleanFilter,
  parseNumberSelection,
  parseBooleanSelection,
  searchFilter,
  choiceFilter,
  displayChoice,
  multiChoiceFilter,
  facetFilter,
} from '../authoring/contract.ts';
export type {
  ReportingPeriod,
  DateRangeContractOptions,
  DateRangeContract,
  DateTimeRangeContract,
  DateTimeRangeRequest,
  RegisteredQuery,
  ConnectionOperation,
  QueryDefinitions,
  QueryParameters,
  QueryParameterValue,
  QueryParameter,
  QueryValueType,
  QueryField,
  QueryProjections,
  QueryRow,
  QueryResult,
  DisclosedQuery,
  DataOperation,
  DimensionSelection,
  DimensionMember,
  DimensionOption,
  DimensionFilter,
  DimensionFilterOptions,
  NumberSelection,
  NumberOperator,
  NumberFilter,
  BooleanSelection,
  BooleanFilter,
  AppFilter,
  FilterValues,
  SearchFilter,
  ChoiceFilter,
  ChoiceOption,
  MultiChoiceFilter,
  FilterCollection,
  FilterPresentation,
  FacetFilter,
  FilterInput,
  DefinedOperation,
  FilterOperationDefinition,
  InputOperationDefinition,
  WithFilterInput,
} from '../authoring/contract.ts';
export type {
  Lakehouse,
  OperationContext,
  DataOperations,
} from './operation-types.ts';

const sourceErrorBrand = Symbol.for('@altertable/data-app/DataSourceError');

export class DataSourceError extends Error {
  readonly [sourceErrorBrand] = true;
  queryName?: string;

  static override [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [sourceErrorBrand]?: unknown })[sourceErrorBrand] === true
    );
  }

  constructor(
    public readonly reason:
      | 'unauthorized'
      | 'forbidden'
      | 'rate_limited'
      | 'query_rejected'
      | 'unavailable',
    public readonly status?: number,
    /** `cause` stays on the server or host for logs; responses carry only the reason. */
    options?: ErrorOptions
  ) {
    super(`Data source ${reason}${status ? ` (${status})` : ''}.`, options);
    this.name = 'DataSourceError';
  }
}

export {
  createMessageRouter,
  defineMessageRoute,
  defineDataQueryRoute,
  MessageRoutingError,
  dataAppRoutes,
  navigationUpdateRoute,
  sqlQueryRoute,
} from './messages.ts';
export type {
  MessageContext,
  RoutedMessage,
  MessageDispatcher,
  MessageTransport,
  MessageRoute,
  MessageRoutes,
  MessageInput,
  MessageHandlers,
  MessageOutput,
  OperationContracts,
  DataQueryInput,
  DataQueryBody,
  DataQueryRoute,
  NavigationUpdate,
  SqlQueryInput,
} from './messages.ts';
export type { TransportResponse } from './bridge.ts';

export {
  annotationDraftRoute,
  annotationModeRoute,
  annotationEditorStateRoute,
  annotationSendRoute,
  annotationUpdateRoute,
  parseDataAppAnnotationDraft,
} from './annotations.ts';
export type {
  DataAppAnnotationDraft,
  DataAppAnnotationPresentation,
} from './annotations.ts';

export {
  parseExternalUrl,
  resolveExternalLinkTarget,
  type ExternalLinkTarget,
  type ExternalLinkModifiers,
  openExternalLinkRoute,
  type OpenExternalLink,
  type ExternalLinkResult,
} from './external-link.ts';
export {
  dateTimeRangeFilter,
  dateTimeRangePresets,
  type DateTimeRangePreset,
  type DateTimeRangeFilter,
  type DateTimeRangeComparisonFilter,
  type DateTimeRangeComparisonFilterOptions,
  type DateTimeRangeComparisonSelection,
  type DateTimeRangeComparisonRequest,
  type DateTimeRangeFilterOptions,
} from '../authoring/contract.ts';
export {
  parseDateTimeRange,
  serializeDateTimeRange,
  resolveDateTimeRange,
  formatDateTimeRange,
  formatDateTimeBound,
  parseDateTimeBound,
} from '../authoring/contract.ts';
export type {
  DateTimeRange,
  ResolvedDateTimeRange,
  AbsoluteOrRelativeDateTime,
  RelativeDateTime,
} from '../authoring/contract.ts';

export { dateTimeRangeSql } from '../authoring/contract.ts';

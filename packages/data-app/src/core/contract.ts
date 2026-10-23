/** Operation authoring and delivery contracts; portable across runtimes. */
export {
  parseEmptyInput,
  parseTrue,
  previousDateRange,
  defineDateRangeContract,
  parseDateRangeInput,
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
  variableInput,
} from '../authoring/contract.ts';
export type {
  DateRangeRequest,
  ReportingPeriod,
  DateRangeContractOptions,
  DateRangeContract,
  RegisteredQuery,
  OperationDefinition,
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
  DateRangeInput,
  DimensionSelection,
  DimensionMember,
  DimensionOption,
  DimensionVariable,
  DimensionFilterOptions,
  NumberSelection,
  NumberOperator,
  NumberFilter,
  BooleanSelection,
  BooleanFilter,
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

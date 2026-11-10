import type { FilterCollection } from '../core/app-filters.ts';
import type { DataOperations, Lakehouse } from '../core/contract.ts';
import { withDimensionSelectors } from '../core/dimension-source.ts';
import type { DimensionOption } from '../core/dimension.ts';
import { facetSource, type FacetFilter } from '../core/facets.ts';
import { invariant } from '../core/invariant.ts';
import { defineDataQueryRoute, MessageRoutingError } from '../core/messages.ts';
import { combineOperationFilters } from '../core/operation-filters.ts';
import type {
  DataQueryBody,
  InputOf,
  OutputOf,
} from '../core/operation-types.ts';
import {
  executeDataOperation,
  toDataOperationFailure,
} from '../core/operation.ts';
import type { IsUnion, KnownRecord } from '../core/queries.ts';
import { randomUuid } from '../core/uuid.ts';
import { appDiagnostics } from './diagnostics.ts';
import { getDataAppTransport, localFrameBridge } from './iframe.ts';
import { createHttpTransport, DataAppError } from './transport.ts';
import type { DataTransport } from './transport.ts';
export type { InputOf, OutputOf } from '../core/operation-types.ts';

/**
 * Parsed operation data and query evidence.
 */
export type DataResponse<Output, Input = unknown> = DataQueryBody<Output> & {
  /** The exact browser input that produced this response. */
  input: Input;
};

/** The filters each operation reads, for operations that read any. */
export type OperationFilters<Operations extends DataOperations> = {
  readonly [
    Name in keyof Operations as Operations[Name] extends {
      filters: infer Filters extends FilterCollection;
    }
      ? keyof Filters extends never
        ? never
        : Name
      : never
  ]: Operations[Name] extends { filters: infer Filters } ? Filters : never;
};

declare const clientContract: unique symbol;
export type DataClient<Operations extends DataOperations> = {
  /** Preserve the operation registry when passing clients through helpers. */
  readonly [clientContract]: (operations: Operations) => Operations;
  /** Each operation's filters; views derive their inputs and controls from them. */
  readonly filters: Readonly<Record<string, FilterCollection>>;
  query<Name extends keyof Operations & string>(
    this: void,
    name: Name & (true extends IsUnion<NoInfer<Name>> ? never : unknown),
    input: InputOf<Operations[NoInfer<Name>]>,
    options?: { signal?: AbortSignal }
  ): Promise<
    DataResponse<OutputOf<Operations[Name]>, InputOf<Operations[Name]>>
  >;
};

/** The factory is the only place that grants a client its invariant contract witness. */
function typedClient<Operations extends DataOperations>(
  implementation: Pick<DataClient<Operations>, 'query' | 'filters'>
): DataClient<Operations> {
  combineOperationFilters(implementation.filters);
  const query = implementation.query;
  implementation.query = async (name, input, options) => {
    const end = appDiagnostics.begin();
    try {
      const result = await query(name, input, options);
      appDiagnostics.clear('operation', name);
      return result;
    } catch (error) {
      if (!options?.signal?.aborted)
        appDiagnostics.record(
          'operation',
          name,
          error instanceof Error && error.cause instanceof Error
            ? error.cause
            : error
        );
      throw error;
    } finally {
      end();
    }
  };
  return implementation as DataClient<Operations>;
}

type TransportOptions = {
  operations?: never;
  lakehouse?: never;
  transport?: DataTransport;
  endpoint?: string;
  fetch?: typeof fetch;
};
/** Server-owned operations stay type-only, so the browser receives their filters. */
type TransportFilters<Operations extends DataOperations> =
  keyof OperationFilters<Operations> extends never
    ? { filters?: OperationFilters<Operations> }
    : {
        /** Pass the same filter declarations the server operations read. */
        filters: OperationFilters<Operations>;
      };

/** Distribute over conditional filter members so each possible facet is checked. */
type UncheckedFacet<Operations extends DataOperations, Filter, Key> =
  Filter extends FacetFilter<infer Value, infer Source>
    ? Source extends keyof Operations
      ? OutputOf<Operations[Source]> extends readonly DimensionOption<Value>[]
        ? never
        : Key
      : Key
    : never;

/** The filter names whose facet options are missing or mistyped. Only known names:
 * a typed contract may widen `filters` with an index signature. */
type UncheckedFacetNames<Operations extends DataOperations, Filters> = {
  [Key in keyof Filters as string extends Key ? never : Key]: UncheckedFacet<
    Operations,
    Filters[Key],
    Key
  >;
} extends infer Checked
  ? Checked[keyof Checked]
  : never;

/** Every facet filter loads its options from a registered operation returning them. */
type CheckedFacets<Operations extends DataOperations> = {
  [Name in keyof Operations]: Operations[Name] extends {
    filters: infer Filters;
  }
    ? UncheckedFacetNames<Operations, Filters>
    : never;
}[keyof Operations] extends never
  ? unknown
  : {
      'Facet filter options must name a registered operation returning DimensionOption[]': never;
    };
/** Browser operations and named-operation delivery are mutually exclusive. */
export type DataClientOptions<Operations extends DataOperations> =
  (KnownRecord<Operations> extends never
    ? never
    : true extends {
          [Name in keyof Operations]: IsUnion<Operations[Name]>;
        }[keyof Operations]
      ? never
      : unknown) &
    (
      | {
          operations: Operations;
          lakehouse?: Lakehouse;
          transport?: never;
          endpoint?: never;
          fetch?: never;
          filters?: never;
        }
      | (TransportOptions & TransportFilters<Operations>)
    ) &
    CheckedFacets<Operations>;

const dataQueryRoute = defineDataQueryRoute();

/** Named HTTP operations, or browser-owned operations executed through an authorized SQL bridge. */
/** Named clients derive data from the declared operations' run return types. */
export function createDataClient<Operations extends DataOperations>(
  ...args: DataClientOptions<Operations> extends never
    ? [options: never]
    : keyof OperationFilters<Operations> extends never
      ? []
      : [options: never]
): DataClient<Operations>;
/** Without an operation contract, external operation data remains unknown. */
export function createDataClient(
  options?: TransportOptions
): DataClient<DataOperations>;
export function createDataClient<Operations extends DataOperations>(
  options: DataClientOptions<Operations>
): DataClient<Operations>;
export function createDataClient<Operations extends DataOperations>(
  options:
    | DataClientOptions<Operations>
    | (TransportOptions & {
        filters?: Readonly<Record<string, FilterCollection>>;
      }) = {}
): DataClient<Operations> {
  if (options.operations)
    return createOperationClient({
      operations: withDimensionSelectors(options.operations),
      lakehouse: options.lakehouse,
    });
  const filters = Object.freeze({ ...options.filters });
  const http = createHttpTransport(options);
  const useHttp = options.endpoint !== undefined || options.fetch !== undefined;

  return typedClient<Operations>({
    filters,
    async query(name, input, { signal } = {}) {
      const transport =
        options.transport ??
        (useHttp ? http : (localFrameBridge()?.transport ?? http));
      const response = await transport(name, input, signal);
      const ok = response.status >= 200 && response.status < 300;
      let body: Omit<DataResponse<OutputOf<Operations[typeof name]>>, 'input'>;
      try {
        // The envelope is validated here; the shared operation contract owns data.
        body = dataQueryRoute.output(response, { operation: name, input })
          .body as typeof body;
      } catch (error) {
        if (signal?.aborted) throw error;
        if (error instanceof MessageRoutingError)
          throw new DataAppError(error.message, error.code, error.requestId);
        throw new DataAppError(
          ok ? 'The data response was invalid.' : 'Could not load data.',
          ok ? 'invalid_response' : 'request_failed'
        );
      }

      return { ...body, input };
    },
  });
}

function createOperationClient<Operations extends DataOperations>(options: {
  operations: Operations;
  lakehouse?: Lakehouse;
}): DataClient<Operations> {
  const operations = Object.freeze({ ...options.operations });
  const filters: Record<string, FilterCollection> = {};
  for (const [name, operation] of Object.entries(operations))
    if (operation.filters && Object.keys(operation.filters).length)
      filters[name] = operation.filters;
  for (const operationFilters of Object.values(filters))
    for (const filter of Object.values(operationFilters)) {
      const facet = (filter as Partial<FacetFilter>)[facetSource];
      if (facet)
        invariant(
          Object.hasOwn(operations, facet.operation),
          `Facet filter ${filter.label} loads options from an unregistered operation: ${facet.operation}.`
        );
    }
  return typedClient<Operations>({
    filters: Object.freeze(filters),
    async query(name, input, { signal } = {}) {
      signal?.throwIfAborted();
      const requestId = randomUuid();
      if (!Object.hasOwn(operations, name))
        throw new DataAppError(
          'Unknown data operation.',
          'not_found',
          requestId
        );
      const lakehouse =
        options.lakehouse ??
        (typeof window === 'undefined'
          ? undefined
          : getDataAppTransport()?.lakehouse);
      if (!lakehouse)
        throw new DataAppError(
          'An authorized SQL bridge must be installed first.',
          'bridge_unavailable',
          requestId
        );

      try {
        const { body } = await executeDataOperation(operations[name]!, input, {
          lakehouse,
          signal: signal ?? new AbortController().signal,
          requestId,
          operationName: name,
          onQuery(queryName, error) {
            if (error === undefined)
              appDiagnostics.clear('query', `${name}: ${queryName}`);
            else appDiagnostics.record('query', `${name}: ${queryName}`, error);
          },
        });

        return { ...body, input } as DataResponse<
          OutputOf<Operations[typeof name]>,
          InputOf<Operations[typeof name]>
        >;
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        if (error instanceof DataAppError) throw error;
        const failure = toDataOperationFailure(error);
        const publicError = new DataAppError(
          failure.message,
          failure.code,
          requestId
        );
        publicError.cause = error;
        throw publicError;
      }
    },
  });
}

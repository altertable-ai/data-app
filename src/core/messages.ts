import type {
  TransportResponse,
  QueryResult,
  QueryValues,
  OperationContracts,
  DataQueryInput,
  DataQueryBody,
  OutputOf,
} from '@/src/core/operation-types';
export type {
  OperationContracts,
  DataQueryInput,
  DataQueryBody,
} from '@/src/core/operation-types';
import { validLocation, type NavigationUpdate } from '@/src/core/navigation';
export type { NavigationUpdate } from '@/src/core/navigation';

export type MessageContext = { signal: AbortSignal };
export type RoutedMessage = { route: string; payload: unknown };
export type MessageDispatcher = (
  message: unknown,
  context: MessageContext
) => Promise<unknown>;
export type MessageTransport = (
  message: RoutedMessage,
  signal?: AbortSignal
) => Promise<unknown>;
export type MessageRoute<Input, Output> = {
  input: (value: unknown) => Input;
  output: (value: unknown, input: Input) => Output;
};
export type MessageRoutes = Record<
  string,
  {
    input: (value: unknown) => unknown;
    output: (value: unknown, input: never) => unknown;
  }
>;
export type MessageInput<Route extends MessageRoutes[string]> = ReturnType<
  Route['input']
>;
export type MessageHandlers<Routes extends MessageRoutes> = {
  [Name in keyof Routes]: (
    payload: MessageInput<Routes[Name]>,
    context: MessageContext
  ) =>
    | ReturnType<Routes[Name]['output']>
    | Promise<ReturnType<Routes[Name]['output']>>;
};

// A bootstrap and its app may bundle independent copies in the same window.
const errorBrand = Symbol.for('@altertable/data-app/MessageRoutingError');

/** Only these deliberate, public failures cross the message boundary. Other errors stay private. */
export class MessageRoutingError extends Error {
  readonly [errorBrand] = true;

  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [errorBrand]?: unknown })[errorBrand] === true
    );
  }

  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'MessageRoutingError';
  }
}

export function defineMessageRoute<Input, Output>(
  route: MessageRoute<Input, Output>
): MessageRoute<Input, Output> {
  return route;
}

/** Contracts are shared; handlers are supplied by the host and never belong in the app bundle. */
export function createMessageRouter<const Routes extends MessageRoutes>(
  routes: Routes,
  handlers: MessageHandlers<NoInfer<Routes>>
) {
  const registered = new Map(
    Object.entries(routes).map(([name, contract]) => {
      const handler = handlers[name];
      if (!name || name.length > 256 || typeof handler !== 'function')
        throw new Error(
          'Each message route requires a handler and a bounded name.'
        );

      return [name, { contract, handler }] as const;
    })
  );

  async function dispatch(
    value: unknown,
    context: MessageContext
  ): Promise<unknown> {
    if (
      !value ||
      typeof value !== 'object' ||
      typeof (value as RoutedMessage).route !== 'string'
    )
      throw new MessageRoutingError(
        'invalid_message',
        'Invalid routed message.'
      );
    const message = value as RoutedMessage;
    const entry = registered.get(message.route);
    if (!entry)
      throw new MessageRoutingError('unknown_route', 'Unknown message route.');
    let payload: unknown;
    try {
      payload = entry.contract.input(message.payload);
    } catch {
      throw new MessageRoutingError(
        'invalid_payload',
        'Invalid message payload.'
      );
    }
    context.signal.throwIfAborted();
    let result: unknown;
    try {
      result = await entry.handler(payload as never, context);
    } catch (error) {
      if (context.signal.aborted) throw context.signal.reason;
      if (error instanceof MessageRoutingError) throw error;
      throw new MessageRoutingError(
        'request_failed',
        'The message request failed. Retry the request.'
      );
    }
    context.signal.throwIfAborted();
    try {
      return entry.contract.output(result, payload as never);
    } catch (error) {
      if (error instanceof MessageRoutingError) throw error;
      throw new MessageRoutingError(
        'invalid_response',
        'Invalid message response.'
      );
    }
  }

  return { dispatch };
}

export type DataQueryRoute<Operations extends OperationContracts> =
  MessageRoute<DataQueryInput<Operations>, TransportResponse> & {
    operations: Operations | undefined;
  };
export type MessageOutput<Route extends MessageRoutes[string], Input> =
  Route extends DataQueryRoute<infer Operations>
    ? Input extends { operation: infer Name extends keyof Operations }
      ? TransportResponse<DataQueryBody<OutputOf<Operations[Name]>>>
      : never
    : ReturnType<Route['output']>;

/** Omit contracts only in generic hosts such as the CLI shell, where Bun validates operations. */
export function defineDataQueryRoute<
  Operations extends OperationContracts = OperationContracts,
>(operations?: Operations): DataQueryRoute<Operations> {
  return {
    operations,
    input(value) {
      if (!value || typeof value !== 'object')
        throw new Error('Invalid query.');
      const request = value as { operation?: unknown; input?: unknown };
      if (
        typeof request.operation !== 'string' ||
        !request.operation ||
        request.operation.length > 256 ||
        request.operation.includes('/')
      )
        throw new Error('Invalid operation.');
      const operation =
        operations && Object.hasOwn(operations, request.operation)
          ? operations[request.operation]
          : undefined;
      if (operations && !operation) throw new Error('Unknown operation.');

      return {
        operation: request.operation,
        input: operation ? operation.input(request.input) : request.input,
      } as DataQueryInput<Operations>;
    },
    output(value, input) {
      if (!value || typeof value !== 'object')
        throw new Error('Invalid data response.');
      const response = value as TransportResponse;
      if (
        !Number.isInteger(response.status) ||
        response.status < 100 ||
        response.status > 599 ||
        !response.body ||
        typeof response.body !== 'object' ||
        Array.isArray(response.body)
      )
        throw new Error('Invalid data response.');
      const body = response.body as DataQueryBody<unknown> & {
        error?: { code?: unknown; message?: unknown; requestId?: unknown };
      };
      if (response.status < 200 || response.status >= 300) {
        const failure = body.error;
        throw new MessageRoutingError(
          typeof failure?.code === 'string' ? failure.code : 'request_failed',
          typeof failure?.message === 'string'
            ? failure.message
            : 'Could not load data.',
          typeof failure?.requestId === 'string' ? failure.requestId : undefined
        );
      }
      if (
        !('data' in body) ||
        typeof body.requestId !== 'string' ||
        typeof body.queriedAt !== 'string' ||
        !Array.isArray(body.queryIds) ||
        !body.queryIds.every(id => typeof id === 'string')
      )
        throw new Error('Invalid data envelope.');
      if (
        body.queries !== undefined &&
        (!Array.isArray(body.queries) ||
          !body.queries.every(
            query =>
              query &&
              typeof query === 'object' &&
              typeof query.name === 'string' &&
              typeof query.statement === 'string' &&
              (query.queryId === undefined || typeof query.queryId === 'string')
          ))
      )
        throw new Error('Invalid query evidence.');
      const operation = operations?.[input.operation];

      return {
        status: response.status,
        body: {
          ...body,
          data: operation ? operation.output(body.data) : body.data,
        },
      };
    },
  };
}

export const navigationUpdateRoute = /* @__PURE__ */ defineMessageRoute({
  input(value: unknown): NavigationUpdate {
    if (!value || typeof value !== 'object')
      throw new Error('Invalid navigation.');
    const input = value as NavigationUpdate;
    if (
      !validLocation(input) ||
      (input.mode !== 'push' && input.mode !== 'replace') ||
      (input.title !== undefined &&
        (typeof input.title !== 'string' || input.title.length > 512))
    )
      throw new Error('Invalid navigation.');

    return {
      search: input.search,
      hash: input.hash,
      mode: input.mode,
      ...(input.title === undefined ? {} : { title: input.title }),
    };
  },
  output(value: unknown): null {
    if (value !== null) throw new Error('Invalid navigation response.');

    return null;
  },
});
export type SqlQueryInput = { statement: string; limit: number };

/** SQL delivery for browser-owned operations. Hosts must enforce backend access and resource limits. */
export const sqlQueryRoute = defineMessageRoute({
  input(value: unknown): SqlQueryInput {
    if (!value || typeof value !== 'object')
      throw new Error('Invalid SQL query.');
    const query = value as { statement?: unknown; limit?: unknown };
    if (
      typeof query.statement !== 'string' ||
      !query.statement.trim() ||
      typeof query.limit !== 'number' ||
      !Number.isSafeInteger(query.limit) ||
      query.limit < 1
    )
      throw new Error('Invalid SQL query.');

    return { statement: query.statement, limit: query.limit };
  },
  output(value: unknown, input: SqlQueryInput): QueryResult {
    if (!value || typeof value !== 'object')
      throw new Error('Invalid query result.');
    const result = value as QueryResult;
    if (
      !Array.isArray(result.columns) ||
      !result.columns.every(
        column =>
          column &&
          typeof column.name === 'string' &&
          (column.type === undefined || typeof column.type === 'string')
      ) ||
      !Array.isArray(result.rows) ||
      result.rows.length > input.limit ||
      !result.rows.every(
        row => Array.isArray(row) && row.length === result.columns.length
      ) ||
      (result.queryId !== undefined && typeof result.queryId !== 'string')
    )
      throw new Error('Invalid query result.');

    return {
      columns: result.columns,
      rows: result.rows,
      ...(result.queryId === undefined ? {} : { queryId: result.queryId }),
    };
  },
});

export const dataAppRoutes = {
  'data:query': /* @__PURE__ */ defineDataQueryRoute(),
  'navigation:update': navigationUpdateRoute,
};

/** Registered statement delivery uses data:query in bundle hosts; HTTP operation hosts retain defineDataQueryRoute(). */
export type RegisteredQueryInput = {
  operation: string;
  /** Prepared-statement parameter values keyed by name. */
  variables: QueryValues;
  limit: number;
};
export const registeredQueryRoute = defineMessageRoute({
  input(value: unknown): RegisteredQueryInput {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Invalid query.');
    const query = value as RegisteredQueryInput;
    if (
      Object.keys(query).some(
        key => !['operation', 'variables', 'limit'].includes(key)
      ) ||
      typeof query.operation !== 'string' ||
      !query.operation.trim() ||
      query.operation.length > 256 ||
      !query.variables ||
      typeof query.variables !== 'object' ||
      Array.isArray(query.variables) ||
      !Number.isSafeInteger(query.limit) ||
      query.limit < 1
    )
      throw new Error('Invalid registered query.');
    return {
      operation: query.operation,
      variables: query.variables,
      limit: query.limit,
    };
  },
  output(value: unknown, input: RegisteredQueryInput): QueryResult {
    return sqlQueryRoute.output(value, { statement: '', limit: input.limit });
  },
});

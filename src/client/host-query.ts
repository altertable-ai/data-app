/**
 * Host SQL calls used by the named-operation adapter. App code does not import this.
 * The host receives `{ sql }` and keeps lakehouse credentials.
 */
import { getDataAppTransport } from '@/src/client/iframe';
import { DataAppError } from '@/src/client/transport';
import type { QueryResult } from '@/src/core/contract';
import { MessageRoutingError } from '@/src/core/messages';

/** Product-host SQL route. It is not registered in `dataAppRoutes`. */
const hostQueryExecuteRoute = 'query:execute';

type HostQueryExecutePayload = { sql: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasQueryErrors(errors: unknown): boolean {
  if (errors == null) return false;
  if (typeof errors === 'string') return errors.trim().length > 0;
  if (Array.isArray(errors)) return errors.length > 0;
  if (record(errors)) return Object.keys(errors).length > 0;

  return true;
}

function errorText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (record(value)) {
    if (typeof value.message === 'string') return value.message;
    if (typeof value.detail === 'string') return value.detail;
    if (typeof value.error === 'string') return value.error;
  }

  return JSON.stringify(value);
}

function formatQueryErrors(errors: unknown): string {
  const text = Array.isArray(errors)
    ? errors.map(errorText).filter(Boolean).join('; ')
    : errorText(errors);

  return text.slice(0, 2_000) || 'The query failed.';
}

function columnAt(
  column: unknown,
  index: number
): QueryResult['columns'][number] {
  if (typeof column === 'string' && column) return { name: column };
  if (record(column)) {
    const name =
      typeof column.name === 'string'
        ? column.name
        : typeof column.column_name === 'string'
          ? column.column_name
          : undefined;
    if (name) {
      return typeof column.type === 'string'
        ? { name, type: column.type }
        : { name };
    }
  }
  throw new DataAppError(
    `Query column ${index} is invalid.`,
    'invalid_response'
  );
}

function requestId(response: Record<string, unknown>): string | undefined {
  if (typeof response.requestId === 'string') return response.requestId;
  if (typeof response.request_id === 'string') return response.request_id;

  return undefined;
}

function queryId(response: Record<string, unknown>): string | undefined {
  if (typeof response.queryId === 'string') return response.queryId;
  if (typeof response.query_id === 'string') return response.query_id;

  return undefined;
}

/**
 * Normalize a `query:execute` response into column-oriented rows.
 * A string, non-empty array, or non-empty object in `errors` fails the call.
 * Columns are names or `{ name }` / `{ column_name }` objects. Rows are positional
 * arrays or objects keyed by column name.
 */
export function parseHostQueryResult(response: unknown): QueryResult {
  if (!record(response))
    throw new DataAppError(
      'The query response was invalid.',
      'invalid_response'
    );
  if (hasQueryErrors(response.errors))
    throw new DataAppError(
      formatQueryErrors(response.errors),
      'source_query_rejected',
      requestId(response)
    );
  if (!Array.isArray(response.columns))
    throw new DataAppError(
      'The query response is missing columns.',
      'invalid_response'
    );
  const columns = response.columns.map(columnAt);
  if (new Set(columns.map(column => column.name)).size !== columns.length)
    throw new DataAppError(
      'Query result columns are duplicated.',
      'invalid_response'
    );
  if (!Array.isArray(response.rows))
    throw new DataAppError(
      'The query response is missing rows.',
      'invalid_response'
    );
  const rows = response.rows.map((row, index) => {
    if (Array.isArray(row)) {
      if (row.length !== columns.length)
        throw new DataAppError(
          `Query row ${index} has the wrong width.`,
          'invalid_response'
        );

      return row;
    }
    if (record(row)) return columns.map(column => row[column.name]);
    throw new DataAppError(
      `Query row ${index} is invalid.`,
      'invalid_response'
    );
  });
  const id = queryId(response);

  return { columns, rows, ...(id ? { queryId: id } : {}) };
}

function hostQueryRequest(sql: string): {
  route: typeof hostQueryExecuteRoute;
  payload: HostQueryExecutePayload;
} {
  return { route: hostQueryExecuteRoute, payload: { sql } };
}

function activeFrame(frame?: Window): Window | undefined {
  if (frame) return frame;
  const host = globalThis as { window?: Window };

  return host.window;
}

/** Send one statement through the installed host transport. The payload is SQL only. */
export async function executeHostQuery(
  sql: string,
  { signal, frame }: { signal?: AbortSignal; frame?: Window } = {}
): Promise<QueryResult> {
  signal?.throwIfAborted();
  if (typeof sql !== 'string' || !sql.trim())
    throw new DataAppError('Query SQL is empty.', 'source_query_rejected');
  const target = activeFrame(frame);
  const bridge = target ? getDataAppTransport(target) : undefined;
  if (!bridge)
    throw new DataAppError(
      'Host transport is not available',
      'bridge_unavailable'
    );
  try {
    const response = await bridge.request(hostQueryRequest(sql), signal);

    return parseHostQueryResult(response);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof MessageRoutingError)
      throw new DataAppError(error.message, error.code, error.requestId);
    throw error;
  }
}

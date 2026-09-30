/**
 * Lakehouse adapter for a host that executes SQL beside its own credentials.
 * The app never calls this. The host does, from `createHostedQueryHandler`.
 */
import {
  DataSourceError,
  type Lakehouse,
  type QueryResult,
} from '@/src/core/contract';

const sourceReasons = [
  'unauthorized',
  'forbidden',
  'rate_limited',
  'query_rejected',
  'unavailable',
] as const;

type SourceReason = (typeof sourceReasons)[number];

/** One statement plus the row cap the operation already enforced. Credentials stay out of this object. */
export type QueryExecutorRequest = { sql: string; limit: number };

/**
 * Host SQL executor. Throw `DataSourceError` for access, rate, and availability failures.
 * Resolve `{ columns, rows, queryId? }` on success. Resolve `{ errors }` or `{ reason }`
 * for a rejected statement or a classified source failure.
 */
export type QueryExecutor = (
  request: QueryExecutorRequest,
  signal: AbortSignal
) => Promise<unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sourceReason(value: unknown): SourceReason | undefined {
  return sourceReasons.find(reason => reason === value);
}

function hasQueryErrors(errors: unknown): boolean {
  if (errors == null) return false;
  if (typeof errors === 'string') return errors.trim().length > 0;
  if (Array.isArray(errors)) return errors.length > 0;
  if (isRecord(errors)) return Object.keys(errors).length > 0;

  return true;
}

function columnAt(
  column: unknown,
  index: number
): QueryResult['columns'][number] {
  if (typeof column === 'string' && column) return { name: column };
  if (isRecord(column) && typeof column.name === 'string' && column.name) {
    return typeof column.type === 'string'
      ? { name: column.name, type: column.type }
      : { name: column.name };
  }
  throw new Error(`Query column ${index} is invalid.`);
}

function parseExecutorResult(value: unknown, limit: number): QueryResult {
  if (!isRecord(value)) throw new Error('Query response is invalid.');
  const reason = sourceReason(value.reason);
  if (reason && !Array.isArray(value.columns))
    throw new DataSourceError(reason);
  if (hasQueryErrors(value.errors)) throw new DataSourceError('query_rejected');
  if (!Array.isArray(value.columns))
    throw new Error('Query response is missing columns.');
  const columns = value.columns.map(columnAt);
  if (new Set(columns.map(column => column.name)).size !== columns.length)
    throw new Error('Query result columns are duplicated.');
  if (!Array.isArray(value.rows))
    throw new Error('Query response is missing rows.');
  const rows = value.rows.map((row, index) => {
    if (!Array.isArray(row) || row.length !== columns.length)
      throw new Error(`Query row ${index} is invalid.`);

    return row;
  });
  if (rows.length > limit)
    throw new Error('Lakehouse returned more rows than requested.');
  if (value.queryId !== undefined && typeof value.queryId !== 'string')
    throw new Error('Query response is invalid.');

  return {
    columns,
    rows,
    ...(typeof value.queryId === 'string' && value.queryId
      ? { queryId: value.queryId }
      : {}),
  };
}

/** Bound each host statement by the operation's row limit and map executor failures to `DataSourceError`. */
export function createQueryExecutorLakehouse(
  execute: QueryExecutor
): Lakehouse {
  return {
    async queryAll(statement, { limit, signal }) {
      signal.throwIfAborted();
      if (!Number.isInteger(limit) || limit < 1)
        throw new Error('Query needs a positive row limit.');
      if (typeof statement !== 'string' || !statement.trim())
        throw new DataSourceError('query_rejected');
      let response: unknown;
      try {
        response = await execute({ sql: statement, limit }, signal);
      } catch (error) {
        if (signal.aborted) throw error;
        if (error instanceof DataSourceError) throw error;
        const reason = sourceReason(isRecord(error) ? error.reason : undefined);
        if (reason) throw new DataSourceError(reason);
        throw error;
      }

      return parseExecutorResult(response, limit);
    },
  };
}

/**
 * Bun local-development serving and server-only lakehouse access.
 * @module @altertable/data-app/server/bun
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/server-bun.md
 */
import {
  DataSourceError,
  type Lakehouse,
  type QueryResult,
} from '@/src/core/contract';
import type { DataOperations } from '@/src/core/contract';
import {
  AltertableLakehouseClient,
  AltertableLakehouseError,
  NetworkError,
  TimeoutError,
  QueryError,
} from '@altertable/lakehouse';
import { createDataHandler } from '@/src/server/handler';

/** Serve one app on localhost through the CLI's lakehouse proxy during development.
 * Hosted servers must authorize every viewer and must use `createDataHandler` directly. */
export function serveLocalApp({
  page,
  operations,
  title,
  port = Number(process.env.PORT ?? 25837),
}: {
  page: Bun.HTMLBundle;
  operations: DataOperations;
  title: string;
  port?: number;
}) {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port,
    development: process.env.NODE_ENV !== 'production',
    idleTimeout: 60,
    routes: { '/': page },
    fetch: createDataHandler(operations, async () => ({
      lakehouse: localLakehouse(),
    })),
  });
  console.log(`${title} running at ${server.url}`);

  return server;
}

/** Server-only SDK adapter. Local development uses the selected CLI profile's proxy. */
export function localLakehouse(
  environment: Record<string, string | undefined> = process.env,
  request: typeof fetch = fetch
): Lakehouse {
  return {
    async queryAll(statement, { limit, signal, params }) {
      const proxyUrl = environment.ALTERTABLE_DATA_PROXY_URL;
      const proxyToken = environment.ALTERTABLE_DATA_PROXY_TOKEN;
      const username = environment.ALTERTABLE_LAKEHOUSE_USERNAME;
      const password = environment.ALTERTABLE_LAKEHOUSE_PASSWORD;
      if (!proxyUrl && (!username || !password))
        throw new DataSourceError('unauthorized');
      if (proxyUrl && !proxyToken) throw new DataSourceError('unauthorized');
      signal.throwIfAborted();
      const cancellation = new AbortController();
      const client = new AltertableLakehouseClient({
        baseUrl: proxyUrl ?? environment.ALTERTABLE_API_BASE,
        username,
        password,
        basicAuthToken: proxyUrl ? proxyToken : undefined,
        retryPolicy: { maxAttempts: 1 },
        fetch: Object.assign(
          async (url: RequestInfo | URL, options?: RequestInit) => {
            const headers = new Headers(options?.headers);
            if (proxyUrl) headers.set('authorization', `Bearer ${proxyToken}`);
            const requestSignal = AbortSignal.any([
              signal,
              cancellation.signal,
              ...(options?.signal ? [options.signal] : []),
            ]);
            const response = await request(url, {
              ...options,
              headers,
              signal: requestSignal,
            });
            return boundedQueryResponse(response, requestSignal);
          },
          { preconnect() {} }
        ),
      });
      try {
        const result = await client.query({ statement, limit, params });
        const { columns, metadata } = result;
        if (
          !metadata ||
          typeof metadata !== 'object' ||
          Array.isArray(metadata) ||
          (metadata.query_id !== undefined &&
            typeof metadata.query_id !== 'string')
        )
          throw new Error('Invalid query metadata.');
        if (new Set(columns.map(column => column.name)).size !== columns.length)
          throw new Error('Query columns must have unique names.');
        const rows: QueryResult['rows'] = [];
        for await (const row of result.rows) {
          signal.throwIfAborted();
          if (rows.length >= limit)
            throw new Error('Lakehouse returned more rows than requested.');
          const values = columns.map(column =>
            Object.hasOwn(row, column.name) ? row[column.name] : undefined
          );
          if (values.some(value => value === undefined))
            throw new Error('Query row is missing a column.');
          rows.push(values);
        }
        return { columns, rows, queryId: metadata.query_id };
      } catch (error) {
        signal.throwIfAborted();
        if (error instanceof QueryError)
          throw new DataSourceError('query_rejected', undefined, {
            cause: error,
          });
        if (error instanceof NetworkError || error instanceof TimeoutError)
          throw new DataSourceError('unavailable', undefined, { cause: error });
        if (
          error instanceof AltertableLakehouseError &&
          error.statusCode !== undefined
        ) {
          const status = error.statusCode;
          const reason =
            status === 401
              ? 'unauthorized'
              : status === 403
                ? 'forbidden'
                : status === 429
                  ? 'rate_limited'
                  : status === 400 || status === 422
                    ? 'query_rejected'
                    : 'unavailable';
          throw new DataSourceError(reason, status, { cause: error });
        }
        throw error;
      } finally {
        cancellation.abort();
      }
    },
  };
}

/** Limit upstream bytes while the SDK owns NDJSON decoding and parsing. */
function boundedQueryResponse(
  response: Response,
  signal: AbortSignal
): Response {
  if (!response.body) return response;
  let bytes = 0;
  const body = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > 5_000_000) throw new Error('Query response is too large.');
        controller.enqueue(chunk);
      },
    }),
    { signal }
  );
  return new Response(body, {
    status: response.status,
    headers: response.headers,
  });
}

/**
 * Bun local-development serving and server-only lakehouse access.
 * @module @altertable/data-app-bun
 * @see https://github.com/altertable-ai/data-app/blob/main/docs/server-bun.md
 */
import {
  DataSourceError,
  registeredQueryRoute,
  type QueryDefinitions,
  type SqlLakehouse,
  type QueryResult,
} from '@altertable/data-app/contract';
import {
  readRequestBody,
  RequestBodyTooLargeError,
} from '@altertable/data-app/internal';
import {
  AltertableLakehouseClient,
  AltertableLakehouseError,
  NetworkError,
  TimeoutError,
  QueryError,
} from '@altertable/lakehouse';

/** Serve one app and its registered queries on localhost through the CLI's lakehouse proxy. */
export function serveLocalApp({
  page,
  queries,
  title,
  port = Number(process.env.PORT ?? 25837),
}: {
  page: Bun.HTMLBundle;
  queries: QueryDefinitions;
  title: string;
  port?: number;
}) {
  const lakehouse = localLakehouse();
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port,
    development: process.env.NODE_ENV !== 'production',
    idleTimeout: 60,
    routes: { '/': page },
    fetch(request) {
      if (new URL(request.url).pathname.startsWith('/api/query/'))
        return handleLocalQuery(request, queries, lakehouse);
      return new Response('Not found', { status: 404 });
    },
  });
  console.log(`${title} running at ${server.url}`);

  return server;
}

async function handleLocalQuery(
  request: Request,
  queries: QueryDefinitions,
  lakehouse: SqlLakehouse
): Promise<Response> {
  const url = new URL(request.url);
  const encodedId = url.pathname.slice('/api/query/'.length);
  if (!encodedId || encodedId.includes('/'))
    return Response.json({ reason: 'query_rejected' }, { status: 404 });
  let queryId: string;
  try {
    queryId = decodeURIComponent(encodedId);
  } catch {
    return Response.json({ reason: 'query_rejected' }, { status: 404 });
  }
  if (!Object.hasOwn(queries, queryId))
    return Response.json({ reason: 'query_rejected' }, { status: 404 });
  if (request.method !== 'POST')
    return Response.json({ reason: 'query_rejected' }, { status: 405 });
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim() !==
    'application/json'
  )
    return Response.json({ reason: 'query_rejected' }, { status: 415 });
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const mode = request.headers.get('sec-fetch-mode');
  if (
    (origin !== null && origin !== url.origin) ||
    (site !== null && site !== 'same-origin') ||
    (site !== null && origin === null) ||
    (mode !== null && mode !== 'cors' && mode !== 'same-origin')
  )
    return Response.json({ reason: 'forbidden' }, { status: 403 });
  let input;
  try {
    const raw = JSON.parse(await readRequestBody(request, 100_000));
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw) ||
      Object.keys(raw).some(key => key !== 'limit' && key !== 'params')
    )
      throw new Error('Invalid local query.');
    input = registeredQueryRoute.input({ ...raw, queryId });
    const declaredParams = queries[queryId]!.params;
    if (
      input.params &&
      Object.keys(input.params).some(key => !Object.hasOwn(declaredParams, key))
    )
      throw new Error('Unknown query parameter.');
  } catch (error) {
    return Response.json(
      { reason: 'query_rejected' },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }
    );
  }
  try {
    const result = await lakehouse.queryAll(queries[queryId]!.statement, {
      limit: input.limit,
      params: input.params,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });
    return Response.json(registeredQueryRoute.output(result, input));
  } catch (error) {
    if (error instanceof DataSourceError) {
      const status = {
        unauthorized: 401,
        forbidden: 403,
        rate_limited: 429,
        query_rejected: 400,
        unavailable: 502,
      }[error.reason];
      return Response.json({ reason: error.reason }, { status });
    }
    console.error(error);
    return Response.json({ reason: 'unavailable' }, { status: 502 });
  }
}

/** Throw an actionable startup error when the selected lakehouse credentials are missing. */
export function validateLakehouseCredentials(
  environment: Record<string, string | undefined> = process.env
): void {
  const proxyUrl = environment.ALTERTABLE_DATA_PROXY_URL;
  const proxyToken = environment.ALTERTABLE_DATA_PROXY_TOKEN;
  const username = environment.ALTERTABLE_LAKEHOUSE_USERNAME;
  const password = environment.ALTERTABLE_LAKEHOUSE_PASSWORD;
  if (proxyUrl && !proxyToken)
    throw new Error(
      'Missing ALTERTABLE_DATA_PROXY_TOKEN. Set it when ALTERTABLE_DATA_PROXY_URL is configured.'
    );
  if (!proxyUrl && (!username || !password))
    throw new Error(
      'Missing lakehouse credentials. Set both ALTERTABLE_LAKEHOUSE_USERNAME and ALTERTABLE_LAKEHOUSE_PASSWORD, or use the CLI lakehouse proxy.'
    );
}

/** Server-only SDK adapter. Local development uses the selected CLI profile's proxy. */
export function localLakehouse(
  environment: Record<string, string | undefined> = process.env,
  request: typeof fetch = fetch
): SqlLakehouse {
  validateLakehouseCredentials(environment);
  const proxyUrl = environment.ALTERTABLE_DATA_PROXY_URL;
  const proxyToken = environment.ALTERTABLE_DATA_PROXY_TOKEN;
  const username = environment.ALTERTABLE_LAKEHOUSE_USERNAME;
  const password = environment.ALTERTABLE_LAKEHOUSE_PASSWORD;
  return {
    async queryAll(statement, { limit, signal, params }) {
      signal.throwIfAborted();
      const cancellation = new AbortController();
      const client = new AltertableLakehouseClient({
        baseUrl: proxyUrl || environment.ALTERTABLE_API_BASE || undefined,
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

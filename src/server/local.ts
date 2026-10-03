import { buildQueryStatement } from '@/src/core/query-template';
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
      canDiscloseSql: true,
    })),
  });
  console.log(`${title} running at ${server.url}`);

  return server;
}

/** Server-only lakehouse adapter. Local development uses the selected CLI profile's proxy. */
export function localLakehouse(
  environment: Record<string, string | undefined> = process.env,
  request: typeof fetch = fetch
): Lakehouse {
  return {
    async queryAll(statement, { limit, signal, variables }) {
      if (variables) statement = buildQueryStatement(statement, variables);
      const proxyUrl = environment.ALTERTABLE_DATA_PROXY_URL;
      const proxyToken = environment.ALTERTABLE_DATA_PROXY_TOKEN;
      const username = environment.ALTERTABLE_LAKEHOUSE_USERNAME;
      const password = environment.ALTERTABLE_LAKEHOUSE_PASSWORD;
      if (!proxyUrl && (!username || !password))
        throw new DataSourceError('unauthorized');
      if (proxyUrl && !proxyToken) throw new DataSourceError('unauthorized');
      const base =
        proxyUrl ??
        environment.ALTERTABLE_API_BASE ??
        'https://api.altertable.ai';
      let response: Response;
      try {
        response = await request(
          new URL('query', `${base.replace(/\/$/, '')}/`),
          {
            method: 'POST',
            headers: {
              authorization: proxyUrl
                ? `Bearer ${proxyToken}`
                : `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ statement, limit }),
            signal,
          }
        );
      } catch (error) {
        if (signal.aborted) throw error;
        throw new DataSourceError('unavailable');
      }
      if (!response.ok) {
        const reason =
          response.status === 401
            ? 'unauthorized'
            : response.status === 403
              ? 'forbidden'
              : response.status === 429
                ? 'rate_limited'
                : response.status === 400 || response.status === 422
                  ? 'query_rejected'
                  : 'unavailable';
        throw new DataSourceError(reason, response.status);
      }
      const body = await readQueryBody(response);

      return parseQueryResult(body, limit);
    },
  };
}

async function readQueryBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Query response is empty.');
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > 5_000_000) {
      await reader.cancel();
      throw new Error('Query response is too large.');
    }
    body += decoder.decode(chunk.value, { stream: true });
  }
  body += decoder.decode();

  return body;
}

function parseQueryResult(body: string, limit: number): QueryResult {
  const lines = body
    .trimEnd()
    .split('\n')
    .filter(line => line.trim());
  if (!lines.length) throw new Error('Query response is empty.');
  const metadata: unknown = JSON.parse(lines[0]!);
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata) ||
    ('query_id' in metadata &&
      metadata.query_id !== undefined &&
      typeof metadata.query_id !== 'string')
  )
    throw new Error('Invalid query metadata.');
  const queryId =
    'query_id' in metadata
      ? (metadata.query_id as string | undefined)
      : undefined;
  let firstRowIndex = 1;
  let columns: QueryResult['columns'] = [];
  if (lines[firstRowIndex]) {
    const columnDefinitions = JSON.parse(lines[firstRowIndex]!) as unknown;
    if (
      Array.isArray(columnDefinitions) &&
      columnDefinitions.every(
        value =>
          typeof value === 'string' ||
          (typeof value === 'object' && value !== null && 'name' in value)
      )
    ) {
      columns = columnDefinitions.map(value =>
        typeof value === 'string' ? { name: value } : parseColumn(value)
      );
      firstRowIndex++;
    }
  }
  const rows = lines.slice(firstRowIndex).map(line => {
    const row: unknown = JSON.parse(line);
    if (
      !Array.isArray(row) ||
      (firstRowIndex === 2 && row.length !== columns.length)
    )
      throw new Error('Invalid query row.');

    return row;
  });
  if (rows.length > limit)
    throw new Error('Lakehouse returned more rows than requested.');

  return { columns, rows, queryId };
}

function parseColumn(value: unknown): QueryResult['columns'][number] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('name' in value) ||
    typeof value.name !== 'string' ||
    ('type' in value &&
      value.type !== undefined &&
      typeof value.type !== 'string')
  )
    throw new Error('Invalid query column.');

  return {
    name: value.name,
    ...('type' in value && value.type !== undefined
      ? { type: value.type as string }
      : {}),
  };
}

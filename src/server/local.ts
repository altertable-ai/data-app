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
import {
  defineDataAppRegistration,
  type DataAppRegistration,
} from '@/src/core/query-registration';
import { registeredQueryRoute } from '@/src/core/messages';
import { createRegisteredQueryHandler } from '@/src/core/query-handler';
import { runtimeHtml } from '@/src/core/runtime-html';
declare const DATA_APP_BOOTSTRAP: string;
declare const DATA_APP_LOCAL_HOST: string;

/** Serve the same sandboxed app bundle and registered-query bridge used by hosted apps. */
export async function serveLocalApp({
  entrypoint,
  registration,
  title,
  port = Number(process.env.PORT ?? 25837),
  maxQueryRows = 10_000,
  maxDurationMs = 30_000,
}: {
  entrypoint: string;
  registration: DataAppRegistration;
  title: string;
  port?: number;
  maxQueryRows?: number;
  maxDurationMs?: number;
}) {
  // Snapshot the registration for this server revision; never accept it from the iframe.
  registration = defineDataAppRegistration(
    JSON.parse(JSON.stringify(registration)) as DataAppRegistration
  );
  if (
    !Number.isSafeInteger(maxQueryRows) ||
    maxQueryRows < 1 ||
    !Number.isSafeInteger(maxDurationMs) ||
    maxDurationMs < 1
  )
    throw new Error('Local query limits must be positive integers.');
  const token = crypto.randomUUID();
  const execute = createRegisteredQueryHandler(registration, async () =>
    localLakehouse()
  );
  async function bundle() {
    const result = await Bun.build({
      entrypoints: [entrypoint],
      throw: false,
      target: 'browser',
      format: 'iife',
      define: { 'import.meta.env': '{}' },
      plugins: [
        {
          name: 'registered-app-boundary',
          setup(build) {
            build.onResolve(
              { filter: /^@altertable\/data-app\/server(?:\/|$)/ },
              () => {
                throw new Error(
                  'Server adapters cannot be imported into the iframe.'
                );
              }
            );
            build.onLoad({ filter: /(?:^|\/)queries\.json$/ }, () => {
              throw new Error(
                'queries.json is server-owned and cannot be imported into the iframe.'
              );
            });
          },
        },
      ],
    });
    if (!result.success)
      throw new Error(result.logs.map(log => log.message).join('\n'));
    const script = await result.outputs
      .find(output => output.path.endsWith('.js'))!
      .text();
    const css = result.outputs.find(output => output.path.endsWith('.css'));
    return css
      ? `const style = document.createElement('style'); style.textContent = ${JSON.stringify(await css.text())}; document.head.append(style);\n${script}`
      : script;
  }
  await bundle();
  function escape(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('"', '&quot;');
  }
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port,
    idleTimeout: 60,
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method === 'GET') {
        if (url.pathname === '/')
          return new Response(
            `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="query-token" content="${token}"><title>${escape(title)}</title><style>html,body{margin:0;height:100%}iframe{display:block;width:100%;height:100%;border:0}[role=status]:empty{display:none}</style></head><body><div role="status"></div><iframe title="${escape(title)}" allow="fullscreen" allowfullscreen></iframe><script src="/__local/host.js"></script></body></html>`,
            {
              headers: {
                'content-type': 'text/html',
                'cache-control': 'no-store',
                'content-security-policy': "frame-ancestors 'self'",
              },
            }
          );
        if (url.pathname === '/__local/host.js')
          return new Response(DATA_APP_LOCAL_HOST, {
            headers: { 'content-type': 'text/javascript' },
          });
        if (url.pathname === '/__local/runtime')
          return new Response(runtimeHtml(url.origin, DATA_APP_BOOTSTRAP), {
            headers: {
              'content-type': 'text/html',
              'cache-control': 'no-store',
            },
          });
        if (url.pathname === '/__local/app.js') {
          try {
            return new Response(await bundle(), {
              headers: {
                'content-type': 'text/javascript',
                'cache-control': 'no-store',
              },
            });
          } catch (error) {
            console.error(error);
            return new Response('App build failed.', { status: 500 });
          }
        }
      }
      if (url.pathname !== '/api/query')
        return new Response('Not found', { status: 404 });
      if (request.method !== 'POST')
        return new Response('Use POST', { status: 405 });
      if (
        request.headers.get('x-data-app-token') !== token ||
        (request.headers.has('origin') &&
          request.headers.get('origin') !== url.origin) ||
        (request.headers.has('sec-fetch-site') &&
          request.headers.get('sec-fetch-site') !== 'same-origin')
      )
        return new Response('Forbidden', { status: 403 });
      if (
        request.headers.get('content-type')?.split(';')[0] !==
        'application/json'
      )
        return new Response('Use JSON', { status: 415 });
      try {
        const body = await request.text();
        if (body.length > 16_384)
          return new Response('Input too large', { status: 413 });
        const query = registeredQueryRoute.input(JSON.parse(body));
        query.limit = Math.min(query.limit, maxQueryRows);
        const signal = AbortSignal.any([
          request.signal,
          AbortSignal.timeout(maxDurationMs),
        ]);
        const result = await execute(query, { signal });
        return Response.json(result, {
          headers: { 'cache-control': 'no-store' },
        });
      } catch {
        return Response.json(
          { error: 'The registered query failed.' },
          { status: 400 }
        );
      }
    },
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

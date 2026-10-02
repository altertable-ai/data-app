import starterPage from '@/examples/starter-local-data-app/src/index.html';
import { localLakehouse, serveLocalApp } from '@altertable/data-app/server/bun';
import { operations as starterOperations } from '@/examples/starter-local-data-app/src/operations';
import starterConfig from '@/examples/starter-local-data-app/app';
import { Database } from 'bun:sqlite';
import { watch } from 'node:fs';
import skeleton from '@/browser-tests/fixtures/skeleton.html';
import hooksApp from '@/browser-tests/fixtures/hooks-app.html';
import gallery from '@/browser-tests/fixtures/gallery.html';
import styles from '@/browser-tests/fixtures/styles.html';
import layout from '@/browser-tests/fixtures/layout.html';
import layoutHost from '@/browser-tests/fixtures/layout-host.html';
import bundleHost from '@/browser-tests/fixtures/bundle-host.html';
import bridgeHost from '@/browser-tests/fixtures/bridge-host.html';
import bridgeFrame from '@/browser-tests/fixtures/bridge-frame.html';

async function bundle(entry: string) {
  const result = await Bun.build({
    entrypoints: [new URL(entry, import.meta.url).pathname],
    target: 'browser',
    format: 'iife',
    define: { 'import.meta.env': '{}' },
    minify: true,
  });
  if (!result.success)
    throw new Error(result.logs.map(log => log.message).join('\n'));

  const javascript = await result.outputs
    .find(output => output.path.endsWith('.js'))!
    .text();
  const stylesheet = result.outputs.find(output =>
    output.path.endsWith('.css')
  );
  if (!stylesheet) return javascript;
  const css = await stylesheet.text();

  return `const style = document.createElement('style'); style.textContent = ${JSON.stringify(css)}; document.head.append(style);\n${javascript}`;
}

const isDevelopment = process.env.DATA_APP_DEV === '1';

/** Bundle once for tests; in development, rebundle on each request so edits apply on reload. */
async function createBundleLoader(entry: string) {
  if (isDevelopment) return () => bundle(entry);
  const javascript = await bundle(entry);
  return () => Promise.resolve(javascript);
}

/** Pages reload when sources outside their own module graph change. */
function createReloadHandler(paths: string[]) {
  const clients = new Set<ReadableStreamDefaultController<string>>();
  let pending: ReturnType<typeof setTimeout> | undefined;
  for (const path of paths)
    watch(new URL(path, import.meta.url).pathname, { recursive: true }, () => {
      clearTimeout(pending);
      pending = setTimeout(() => {
        for (const client of clients) client.enqueue('data: reload\n\n');
      }, 100);
    });

  return (request: Request) =>
    new Response(
      new ReadableStream<string>({
        start(client) {
          clients.add(client);
          request.signal.addEventListener('abort', () =>
            clients.delete(client)
          );
        },
      }),
      {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
        },
      }
    );
}

// Exercise the published single-file deployment without rebundling it.
const { default: worker } = (await import(
  import.meta.resolve('@altertable/data-app/worker')
)) as typeof import('@/src/worker');
const loadFixtureBundle = await createBundleLoader('./fixtures/bundle-app.tsx');
const loadAnnotationStateBundle = await createBundleLoader(
  './fixtures/annotation-state-app.tsx'
);
// Tests exercise the hosted starter; `bun run dev` serves the playground, which
// queries the demo tables it seeds into the mocked API.
const hostedApps = {
  development: { path: '/playground', entry: '../dev/playground.tsx' },
  test: {
    path: '/starter-data-app',
    entry: '../examples/starter-data-app/index.tsx',
  },
};
const hostedApp = hostedApps[isDevelopment ? 'development' : 'test'];
const loadHostedAppBundle = await createBundleLoader(hostedApp.entry);
const serveReloadEvents =
  isDevelopment &&
  createReloadHandler([
    '../dev',
    './fixtures/bundle-app.tsx',
    './fixtures/bridge-frame.ts',
  ]);
const fixtureDatabase = new Database(':memory:');
const port = Number(process.env.DATA_APP_TEST_PORT ?? 27418);
// `bun run dev` provides a mocked Altertable API; tests keep deterministic fixtures.
const lakehouse =
  isDevelopment && process.env.ALTERTABLE_API_BASE ? localLakehouse() : null;
if (!lakehouse) {
  process.env.ALTERTABLE_DATA_PROXY_URL = `http://127.0.0.1:${port}/__test/proxy`;
  process.env.ALTERTABLE_DATA_PROXY_TOKEN = 'local-test-fixture';
}
if (!isDevelopment) process.env.NODE_ENV = 'production';
serveLocalApp({
  page: starterPage,
  operations: starterOperations,
  title: starterConfig.title,
  port: port + 2,
});
const loadFrameBundle = await createBundleLoader('./fixtures/bridge-frame.ts');
Bun.serve({
  hostname: '127.0.0.1',
  port: port + 1,
  async fetch() {
    return new Response(
      `<!doctype html><html data-parent-origin="http://127.0.0.1:${port}"><body><p id="location"></p><p id="result"></p><button id="query">Query</button><button id="filter">Last 7 days</button><script>${(await loadFrameBundle()).replaceAll('</script', '<\\/script')}</script></body></html>`,
      { headers: { 'content-type': 'text/html' } }
    );
  },
});
Bun.serve({
  hostname: '127.0.0.1',
  port,
  development: isDevelopment && { hmr: true },
  routes: {
    '/skeleton': skeleton,
    '/gallery': gallery,
    '/styles': styles,
    '/layout': layoutHost,
    '/layout-frame': layout,
    '/hooks-app': hooksApp,
    '/bridge-host': bridgeHost,
    '/bridge-frame': bridgeFrame,
    '/bundle-host': bundleHost,
    [hostedApp.path]: bundleHost,
  },
  async fetch(request, server) {
    const path = new URL(request.url).pathname;
    if (path === '/') return new Response('Embedding test server');
    if (serveReloadEvents && path === '/__dev/reload') {
      server.timeout(request, 0);
      return serveReloadEvents(request);
    }
    if (path === `/__test${hostedApp.path}`)
      return new Response(await loadHostedAppBundle());
    if (path === '/__test/annotation-state')
      return new Response(await loadAnnotationStateBundle());
    if (path === '/__test/bundle')
      return new Response(await loadFixtureBundle());
    if (path === '/__test/silent')
      return new Response('<!doctype html><body>Silent frame</body>', {
        headers: { 'content-type': 'text/html' },
      });
    if (path === '/__test/runtime')
      // Adapt the local fixture URL to a deployment preview hostname.
      return worker.fetch(
        new Request(
          `https://test-report-app-1.example.test/${new URL(request.url).search}`,
          request
        ),
        {
          DOMAIN_NAME: 'example.test',
          PARENT_ORIGINS: `http://127.0.0.1:${port}`,
        }
      );
    if (path === '/__test/proxy/query') {
      const query = (await request.json()) as {
        statement: string;
        limit: number;
      };
      if (
        request.headers.get('authorization') !== 'Bearer local-test-fixture' ||
        query.statement !== 'SELECT 1 AS connection_check' ||
        query.limit !== 1
      )
        return new Response('Rejected fixture query', { status: 403 });
      return new Response(
        '{"query_id":"starter-query"}\n["connection_check"]\n[1]\n'
      );
    }
    if (path === '/api/sql') {
      const delay = isDevelopment
        ? Number(
            new URL(
              request.headers.get('referer') ?? request.url
            ).searchParams.get('delay')
          )
        : 0;
      if (delay > 0) await Bun.sleep(Math.min(delay, 30_000));
      const query = (await request.json()) as {
        statement: string;
        limit: number;
      };
      if (lakehouse) {
        try {
          const { columns, rows, queryId } = await lakehouse.queryAll(
            query.statement,
            { limit: query.limit, signal: request.signal }
          );
          return Response.json({ columns, rows, queryId });
        } catch (error) {
          console.error('Mocked Altertable API query failed:', error);
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 502 }
          );
        }
      }
      if (
        query.statement.trim().startsWith('WITH sample_counts(') &&
        query.limit === 10
      ) {
        const rows = fixtureDatabase.query(query.statement).values();
        return Response.json({
          columns: [{ name: 'group_name' }, { name: 'sample_count' }],
          rows,
          queryId: 'sample-query',
        });
      }
      if (
        query.statement !== 'SELECT 1 AS connection_check' ||
        query.limit !== 1
      )
        return Response.json(
          { error: 'Unexpected SQL request' },
          { status: 400 }
        );
      return Response.json({
        columns: [{ name: 'connection_check' }],
        rows: [[1]],
        queryId: 'sql-query',
      });
    }
    if (path === '/api/data/forbidden')
      return Response.json(
        { error: { code: 'forbidden', message: 'Denied' } },
        { status: 403 }
      );
    if (path === '/api/data/connection')
      return Response.json({
        data: true,
        requestId: 'request',
        queriedAt: '2026-09-30T00:00:00Z',
        queryIds: ['query'],
      });

    return new Response('Not found', { status: 404 });
  },
});

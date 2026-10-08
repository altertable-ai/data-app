import starterPage from '@/examples/starter-local-data-app/src/index.html';
import { localLakehouse, serveLocalApp } from '@altertable/data-app/server/bun';
import { operations as starterOperations } from '@/examples/starter-local-data-app/src/operations';
import starterQueries from '@/examples/starter-local-data-app/src/queries.json';
import playgroundQueries from '@/dev/queries.json';
import starterConfig from '@/examples/starter-local-data-app/app';
import { watch } from 'node:fs';
import { parseDataAppAnnotationDraft } from '@altertable/data-app/contract';
import skeleton from '@/dev/fixtures/skeleton.html';
import hooksApp from '@/dev/fixtures/hooks-app.html';
import inspectionApp from '@/dev/fixtures/inspection-app.html';
import gallery from '@/dev/fixtures/gallery.html';
import styles from '@/dev/fixtures/styles.html';
import appearance from '@/dev/fixtures/appearance.html';
import styleStress from '@/dev/fixtures/style-stress.html';
import layout from '@/dev/fixtures/layout.html';
import layoutHost from '@/dev/fixtures/layout-host.html';
import bundleHost from '@/dev/fixtures/bundle-host.html';
import bridgeHost from '@/dev/fixtures/bridge-host.html';
import bridgeFrame from '@/dev/fixtures/bridge-frame.html';

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
  const sessionId = crypto.randomUUID();
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
          client.enqueue(`event: ready\ndata: ${sessionId}\n\n`);
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
const loadPlaygroundBundle = isDevelopment
  ? loadHostedAppBundle
  : await createBundleLoader('../dev/playground.tsx');
const serveReloadEvents =
  isDevelopment &&
  createReloadHandler([
    '../dev',
    './fixtures/bundle-app.tsx',
    './fixtures/bridge-frame.ts',
  ]);
const port = Number(process.env.DATA_APP_TEST_PORT ?? 27418);
// `bun run dev` provides a mocked Altertable API; tests keep deterministic fixtures.
const lakehouse =
  isDevelopment && process.env.ALTERTABLE_API_BASE
    ? localLakehouse(playgroundQueries)
    : null;
if (!lakehouse) {
  process.env.ALTERTABLE_DATA_PROXY_URL = `http://127.0.0.1:${port}/__test/proxy`;
  process.env.ALTERTABLE_DATA_PROXY_TOKEN = 'local-test-fixture';
}
if (!isDevelopment) process.env.NODE_ENV = 'production';
serveLocalApp({
  page: starterPage,
  operations: starterOperations,
  queries: starterQueries,
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
    '/inspection-app': inspectionApp,
    '/gallery': gallery,
    '/gallery/components': request =>
      Response.redirect(new URL('/gallery?view=widgets', request.url), 302),
    '/styles': styles,
    '/appearance': appearance,
    '/style-stress': styleStress,
    '/layout': layoutHost,
    '/layout-frame': layout,
    '/hooks-app': hooksApp,
    '/bridge-host': bridgeHost,
    '/bridge-frame': bridgeFrame,
    '/bundle-host': bundleHost,
    '/playground': bundleHost,
    [hostedApp.path]: bundleHost,
  },
  async fetch(request, server) {
    const path = new URL(request.url).pathname;
    if (path === '/') return new Response('Embedding test server');
    if (path === '/api/annotations' && request.method === 'POST') {
      try {
        const input = (await request.json()) as { annotations?: unknown[] };
        if (
          !Array.isArray(input.annotations) ||
          input.annotations.length === 0 ||
          input.annotations.length > 50
        )
          throw new Error('Invalid annotation batch.');
        const annotations = input.annotations.map(parseDataAppAnnotationDraft);
        if (
          new TextEncoder().encode(
            JSON.stringify(
              annotations.map(annotation => ({
                ...annotation,
                context: { ...annotation.context, screenshot: undefined },
              }))
            )
          ).byteLength > 120_000
        )
          throw new Error('Annotation batch is too large.');
        const imageBytes = annotations.reduce((total, annotation) => {
          const encoded = annotation.context.screenshot?.dataUrl.split(',')[1];
          return (
            total +
            (encoded
              ? (encoded.length / 4) * 3 -
                (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
              : 0)
          );
        }, 0);
        if (imageBytes > 4 * 1024 * 1024)
          throw new Error('Annotation images are too large.');
        return Response.json({ acceptedCount: annotations.length });
      } catch {
        return Response.json(
          { error: 'Invalid annotation batch.' },
          { status: 400 }
        );
      }
    }
    if (serveReloadEvents && path === '/__dev/reload') {
      server.timeout(request, 0);
      return serveReloadEvents(request);
    }
    if (path === '/__test/playground')
      return new Response(await loadPlaygroundBundle());
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
    if (path === '/api/registered-query') {
      const delay = isDevelopment
        ? Number(
            new URL(
              request.headers.get('referer') ?? request.url
            ).searchParams.get('delay')
          )
        : 0;
      if (delay > 0) await Bun.sleep(Math.min(delay, 30_000));
      const query = (await request.json()) as {
        operation: string;
        variables: Record<string, string>;
        limit: number;
      };
      // `bun run dev` runs playground queries against the mocked Altertable API.
      if (lakehouse && Object.hasOwn(playgroundQueries, query.operation)) {
        try {
          const { columns, rows, queryId } = await lakehouse.queryById(
            query.operation,
            query.variables,
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
      // Fixed backend fixtures for the starter and connection check; no SQL engine.
      if (query.operation === 'connection-check' && query.limit === 1)
        return Response.json({
          columns: [{ name: 'connection_check' }],
          rows: [[1]],
          queryId: 'connection-query',
        });
      if (query.operation !== 'sample-counts-by-group')
        return Response.json(
          { error: 'Unknown fixture query' },
          { status: 400 }
        );
      const groupName = query.variables.groupName ?? '';
      return Response.json({
        columns: [{ name: 'group_name' }, { name: 'sample_count' }],
        rows: [
          ['Alpha', 3],
          ['Beta', 0],
        ]
          .filter(([group]) => !groupName || group === groupName)
          .slice(0, query.limit),
        queryId: 'sample-query',
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

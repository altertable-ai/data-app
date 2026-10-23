import { Database } from 'bun:sqlite';

import { serveLocalApp } from '@altertable/data-app-bun';

import starterPage from '@/packages/data-app-examples/templates/starter-local-data-app/src/index.html';
import { operations } from '@/packages/data-app-examples/templates/starter-local-data-app/src/operations';
import annotationsHost from '@/tests/public-api/fixtures/annotations-host.html';
import appearance from '@/tests/public-api/fixtures/appearance.html';
import bridgeFrame from '@/tests/public-api/fixtures/bridge-frame.html';
import bridgeHost from '@/tests/public-api/fixtures/bridge-host.html';
import bundleHost from '@/tests/public-api/fixtures/bundle-host.html';
import chartLegends from '@/tests/public-api/fixtures/chart-legends.html';
import clients from '@/tests/public-api/fixtures/clients.html';
import controls from '@/tests/public-api/fixtures/controls.html';
import dateAxes from '@/tests/public-api/fixtures/date-axes.html';
import datePresentation from '@/tests/public-api/fixtures/date-presentation.html';
import declaredApp from '@/tests/public-api/fixtures/declared-app.html';
import diagnosticsHost from '@/tests/public-api/fixtures/diagnostics-host.html';
import exploration from '@/tests/public-api/fixtures/exploration.html';
import filterPresentation from '@/tests/public-api/fixtures/filter-presentation.html';
import filters from '@/tests/public-api/fixtures/filters.html';
import inspectionApp from '@/tests/public-api/fixtures/inspection-app.html';
import layout from '@/tests/public-api/fixtures/layout.html';
import ownership from '@/tests/public-api/fixtures/ownership.html';
import searchCatalog from '@/tests/public-api/fixtures/search-catalog.html';
import staticApp from '@/tests/public-api/fixtures/static.html';
import styles from '@/tests/public-api/fixtures/styles.html';
import timeApp from '@/tests/public-api/fixtures/time-app.html';

const port = Number(process.env.DATA_APP_TEST_PORT ?? 0);
async function bundle(entry: string) {
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'iife',
    define: { 'import.meta.env': '{}' },
  });
  if (!result.success)
    throw new Error(result.logs.map(log => log.message).join('\n'));
  return result.outputs[0]!.text();
}
const [
  app,
  starter,
  frame,
  annotations,
  annotationState,
  contentSizing,
  diagnostics,
] = await Promise.all([
  bundle('tests/public-api/fixtures/bundle-app.tsx'),
  bundle('packages/data-app-examples/templates/starter-data-app/index.tsx'),
  bundle('tests/public-api/fixtures/bridge-frame.ts'),
  bundle('tests/public-api/fixtures/annotations-app.tsx'),
  bundle('tests/public-api/fixtures/annotation-state-app.tsx'),
  bundle('tests/public-api/fixtures/content-sizing-app.tsx'),
  bundle('tests/public-api/fixtures/diagnostics-app.tsx'),
]);
const { default: worker } = await import(
  import.meta.resolve('@altertable/data-app-worker')
);
const database = new Database(':memory:');

process.env.ALTERTABLE_DATA_PROXY_TOKEN = 'fixture-token';
process.env.NODE_ENV = 'production';
const frameServer = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(): Response {
    return new Response(
      `<!doctype html><html data-parent-origin="${server.url.origin}"><body><output aria-label="App location" id="location"></output><output aria-label="Query result" id="result"></output><button id="query">Query</button><button id="filter">Last 7 days</button><script>${frame.replaceAll('</script', '<\\/script')}</script></body></html>`,
      { headers: { 'content-type': 'text/html' } }
    );
  },
});
const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  routes: {
    '/exploration': exploration,
    '/date-axes': dateAxes,
    '/bundle-host': bundleHost,
    '/starter-data-app': bundleHost,
    '/bridge-host': bridgeHost,
    '/bridge-frame': bridgeFrame,
    '/inspection-app': inspectionApp,
    '/declared-app': declaredApp,
    '/controls': controls,
    '/filters': filters,
    '/filter-presentation': filterPresentation,
    '/search-catalog': searchCatalog,
    '/static': staticApp,
    '/layout': layout,
    '/ownership': ownership,
    '/annotations-host': annotationsHost,
    '/appearance': appearance,
    '/date-presentation': datePresentation,
    '/styles': styles,
    '/chart-legends': chartLegends,
    '/time-app': timeApp,
    '/clients': clients,
    '/diagnostics': diagnosticsHost,
  },
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('Ready');
    if (url.pathname === '/__test/config')
      return Response.json({
        frameURL: frameServer.url.href,
        localURL: local.url.href,
      });
    if (url.pathname === '/__test/annotations')
      return new Response(annotations);
    if (url.pathname === '/__test/annotation-state')
      return new Response(annotationState);
    if (url.pathname === '/__test/diagnostics')
      return new Response(diagnostics);
    if (url.pathname === '/__test/bundle') return new Response(app);
    if (url.pathname === '/__test/content-sizing')
      return new Response(contentSizing);
    if (url.pathname === '/__test/starter-data-app')
      return new Response(starter);
    if (url.pathname === '/__test/silent')
      return new Response('<!doctype html><body>Silent frame</body>', {
        headers: { 'content-type': 'text/html' },
      });
    if (url.pathname === '/__test/runtime')
      return worker.fetch(
        new Request(
          `https://test-report-03gyrydq17xftovxkqhaybeyi.example.test/${url.search}`,
          request
        ),
        {
          DOMAIN_NAME: 'example.test',
          PARENT_ORIGINS: server.url.origin,
        }
      );
    if (url.pathname === '/proxy/query') {
      if (request.headers.get('authorization') !== 'Bearer fixture-token')
        return new Response('Denied', { status: 403 });
      return new Response(
        '{"query_id":"starter-query"}\n[{"name":"connection_check","type":"INTEGER"}]\n[1]\n'
      );
    }
    if (url.pathname === '/api/sql') {
      const { statement, limit, params } = (await request.json()) as {
        statement: string;
        limit: number;
        params?: Record<string, string | number>;
      };
      if (statement.trim().startsWith('WITH sample_counts(') && limit === 10)
        return Response.json({
          columns: [{ name: 'group_name' }, { name: 'sample_count' }],
          rows: database
            .query(statement)
            .values(
              Object.fromEntries(
                Object.entries(params ?? {}).map(([key, value]) => [
                  `$${key}`,
                  value,
                ])
              )
            ),
          queryId: 'sample-query',
        });
      if (statement === 'SELECT 1 AS connection_check' && limit === 1)
        return Response.json({
          columns: [{ name: 'connection_check' }],
          rows: [[1]],
          queryId: 'sql-query',
        });
      return new Response('Unexpected query', { status: 400 });
    }
    if (url.pathname === '/api/data/forbidden')
      return Response.json(
        { error: { code: 'forbidden', message: 'Denied' } },
        { status: 403 }
      );
    return new Response('Not found', { status: 404 });
  },
});

process.env.ALTERTABLE_DATA_PROXY_URL = new URL('/proxy', server.url).href;
const local = serveLocalApp({
  page: starterPage,
  operations,
  title: 'Local starter',
  port: 0,
});
console.log(
  'DATA_APP_TEST_SERVER ' +
    JSON.stringify({ baseURL: server.url.href, localURL: local.url.href })
);

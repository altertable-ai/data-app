import { serveLocalApp } from '@altertable/data-app/server/bun';
import starterPage from '@/examples/starter-local-data-app/src/index.html';
import { operations } from '@/examples/starter-local-data-app/src/operations';
import queries from '@/examples/starter-local-data-app/src/queries.json';
import bundleHost from '@/tests/public-api/fixtures/bundle-host.html';
import bridgeHost from '@/tests/public-api/fixtures/bridge-host.html';
import bridgeFrame from '@/tests/public-api/fixtures/bridge-frame.html';
import inspectionApp from '@/tests/public-api/fixtures/inspection-app.html';
import timeApp from '@/tests/public-api/fixtures/time-app.html';
import clients from '@/tests/public-api/fixtures/clients.html';
import annotationsHost from '@/tests/public-api/fixtures/annotations-host.html';
import appearance from '@/tests/public-api/fixtures/appearance.html';
import ownership from '@/tests/public-api/fixtures/ownership.html';
import layout from '@/tests/public-api/fixtures/layout.html';
import styles from '@/tests/public-api/fixtures/styles.html';
import staticApp from '@/tests/public-api/fixtures/static.html';
import declaredApp from '@/tests/public-api/fixtures/declared-app.html';

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
const [app, starter, frame, annotations, annotationState] = await Promise.all([
  bundle('tests/public-api/fixtures/bundle-app.tsx'),
  bundle('examples/starter-data-app/index.tsx'),
  bundle('tests/public-api/fixtures/bridge-frame.ts'),
  bundle('tests/public-api/fixtures/annotations-app.tsx'),
  bundle('tests/public-api/fixtures/annotation-state-app.tsx'),
]);
const { default: worker } = await import(
  import.meta.resolve('@altertable/data-app/worker')
);

process.env.ALTERTABLE_DATA_PROXY_TOKEN = 'fixture-token';
process.env.NODE_ENV = 'production';
const local = serveLocalApp({
  page: starterPage,
  operations,
  queries,
  title: 'Local starter',
  port: 0,
});
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
    '/bundle-host': bundleHost,
    '/starter-data-app': bundleHost,
    '/bridge-host': bridgeHost,
    '/bridge-frame': bridgeFrame,
    '/inspection-app': inspectionApp,
    '/declared-app': declaredApp,
    '/static': staticApp,
    '/layout': layout,
    '/ownership': ownership,
    '/annotations-host': annotationsHost,
    '/appearance': appearance,
    '/styles': styles,
    '/time-app': timeApp,
    '/clients': clients,
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
    if (url.pathname === '/__test/bundle') return new Response(app);
    if (url.pathname === '/__test/starter-data-app')
      return new Response(starter);
    if (url.pathname === '/__test/silent')
      return new Response('<!doctype html><body>Silent frame</body>', {
        headers: { 'content-type': 'text/html' },
      });
    if (url.pathname === '/__test/runtime')
      return worker.fetch(
        new Request(
          `https://test-report-app-1.example.test/${url.search}`,
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
      const { statement, params } = (await request.json()) as {
        statement: string;
        params: unknown;
      };
      if (
        statement !== 'SELECT 1 AS connection_check' ||
        JSON.stringify(params) !== '{}'
      )
        return new Response('Unexpected query', { status: 400 });
      return new Response(
        '{"query_id":"starter-query"}\n["connection_check"]\n[1]\n'
      );
    }
    // Fixed backend fixture for registered queries; no SQL engine.
    if (url.pathname === '/api/registered-query') {
      const { operation, variables, limit } = (await request.json()) as {
        operation: string;
        variables: { groupName?: string };
        limit: number;
      };
      if (operation === 'connection-check' && limit === 1)
        return Response.json({
          columns: [{ name: 'connection_check' }],
          rows: [[1]],
          queryId: 'connection-query',
        });
      if (operation !== 'sample-counts-by-group')
        return new Response('Unknown query', { status: 400 });
      const groupName = variables.groupName ?? '';
      return Response.json({
        columns: [{ name: 'group_name' }, { name: 'sample_count' }],
        rows: [
          ['Alpha', 2200000],
          ['Beta', 0],
        ]
          .filter(([group]) => !groupName || group === groupName)
          .slice(0, limit),
        queryId: 'sample-query',
      });
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
console.log(
  'DATA_APP_TEST_SERVER ' +
    JSON.stringify({ baseURL: server.url.href, localURL: local.url.href })
);

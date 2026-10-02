import starterPage from '@/examples/starter-local-data-app/src/index.html';
import { serveLocalApp } from '@altertable/data-app/server/bun';
import { operations as starterOperations } from '@/examples/starter-local-data-app/src/operations';
import starterConfig from '@/examples/starter-local-data-app/app';
import { Database } from 'bun:sqlite';
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

// Exercise the published single-file deployment without rebundling it.
const { default: worker } = (await import(
  import.meta.resolve('@altertable/data-app/worker')
)) as typeof import('@/src/worker');
const app = await bundle('./fixtures/bundle-app.tsx');
const hostedStarterBundle = await bundle(
  '../examples/starter-data-app/index.tsx'
);
const fixtureDatabase = new Database(':memory:');
const port = Number(process.env.DATA_APP_TEST_PORT ?? 27418);
process.env.ALTERTABLE_DATA_PROXY_URL = `http://127.0.0.1:${port}/__test/proxy`;
process.env.ALTERTABLE_DATA_PROXY_TOKEN = 'local-test-fixture';
process.env.NODE_ENV = 'production';
serveLocalApp({
  page: starterPage,
  operations: starterOperations,
  title: starterConfig.title,
  port: port + 2,
});
const urlApp = await bundle('./fixtures/bridge-frame.ts');
Bun.serve({
  hostname: '127.0.0.1',
  port: port + 1,
  fetch() {
    return new Response(
      `<!doctype html><html data-parent-origin="http://127.0.0.1:${port}"><body><p id="location"></p><p id="result"></p><button id="query">Query</button><button id="filter">Last 7 days</button><script>${urlApp.replaceAll('</script', '<\\/script')}</script></body></html>`,
      { headers: { 'content-type': 'text/html' } }
    );
  },
});
Bun.serve({
  hostname: '127.0.0.1',
  port,
  development: false,
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
    '/starter-data-app': bundleHost,
  },
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/') return new Response('Embedding test server');
    if (path === '/__test/starter-data-app')
      return new Response(hostedStarterBundle);
    if (path === '/__test/bundle') return new Response(app);
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
      const query = (await request.json()) as {
        statement: string;
        limit: number;
      };
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

import skeleton from '@/browser-tests/fixtures/skeleton.html';
import hooksApp from '@/browser-tests/fixtures/hooks-app.html';
import gallery from '@/browser-tests/fixtures/gallery.html';
import bundleHost from '@/browser-tests/fixtures/bundle-host.html';
import bridgeHost from '@/browser-tests/fixtures/bridge-host.html';
import bridgeFrame from '@/browser-tests/fixtures/bridge-frame.html';

async function bundle(entry: string) {
  const result = await Bun.build({
    entrypoints: [new URL(entry, import.meta.url).pathname],
    target: 'browser',
    minify: true,
  });
  if (!result.success)
    throw new Error(result.logs.map(log => log.message).join('\n'));

  return result.outputs[0]!.text();
}

// Exercise the published single-file deployment without rebundling it.
const { default: worker } = (await import(
  import.meta.resolve('@altertable/data-app/worker')
)) as typeof import('@/src/worker');
const app = await bundle('./fixtures/bundle-app.tsx');
const port = Number(process.env.DATA_APP_TEST_PORT ?? 27418);
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
    '/hooks-app': hooksApp,
    '/bridge-host': bridgeHost,
    '/bridge-frame': bridgeFrame,
    '/bundle-host': bundleHost,
  },
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/') return new Response('Embedding test server');
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

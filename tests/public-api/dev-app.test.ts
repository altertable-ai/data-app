import { spawn, type ChildProcess } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { chromium } from 'playwright';

const children: ChildProcess[] = [];
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  await Promise.all(children.splice(0).map(stop));
  await Promise.all(cleanups.splice(0).map(cleanup => cleanup()));
});

function stop(child: ChildProcess) {
  return new Promise<void>(done => {
    if (child.exitCode !== null || child.signalCode !== null) return done();
    child.once('exit', () => done());
    child.kill('SIGTERM');
  });
}

async function temporaryDirectory(parent = tmpdir()) {
  const directory = await realpath(
    await mkdtemp(join(parent, 'data-app-dev-'))
  );
  cleanups.push(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function run(args: string[], env: Record<string, string> = {}) {
  const child = spawn('bun', args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let output = '';
  child.stdout?.on('data', chunk => (output += chunk));
  child.stderr?.on('data', chunk => (output += chunk));
  const exited = new Promise<number>(done =>
    child.once('exit', code => done(code ?? 1))
  );

  return { child, exited, output: () => output };
}

async function waitForOutput(
  command: ReturnType<typeof run>,
  pattern: RegExp,
  timeout = 20_000
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const match = command.output().match(pattern);
    if (match) return match;
    if (command.child.exitCode !== null)
      throw new Error(`Exited early:\n${command.output()}`);
    await new Promise(done => setTimeout(done, 50));
  }
  throw new Error(`Timed out waiting for ${pattern}:\n${command.output()}`);
}

async function startFile(entry: string, env: Record<string, string> = {}) {
  const command = run(['run', 'dev:file', entry], { PORT: '0', ...env });
  const [url] = await waitForOutput(command, /http:\/\/127\.0\.0\.1:\d+\//);
  return { ...command, url };
}

function readReloads(url: string) {
  const events: string[] = [];
  const controller = new AbortController();
  cleanups.push(async () => controller.abort());
  void fetch(new URL('/reload', url), { signal: controller.signal })
    .then(async response => {
      const decoder = new TextDecoder();
      for await (const chunk of response.body!)
        events.push(decoder.decode(chunk));
    })
    .catch(() => {});
  return events;
}

test('dev:file refuses to start without a data app file', async () => {
  const missing = run(['run', 'dev:file']);
  const absent = run(['run', 'dev:file', '/private/tmp/no-such-app.tsx']);

  expect(await missing.exited).not.toBe(0);
  expect(await absent.exited).not.toBe(0);
  expect(missing.output()).toContain('bun run dev:file <path>');
  expect(absent.output()).toContain('/private/tmp/no-such-app.tsx');
});

test('dev:file bundles an app outside the checkout and proxies its SQL', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  await writeFile(
    entry,
    `import { defineDataApp } from '@altertable/data-app';
const dataApp = defineDataApp({
  title: 'Dev file marker',
  description: 'Local file dev.',
  scope: { organization: 'demo', environment: 'local' },
  queries: {},
});
console.log(dataApp.title);
`
  );
  let proxied: unknown;
  const proxy = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    proxied = JSON.parse(body);
    if (request.headers.authorization !== 'Bearer file-dev-token') {
      response.writeHead(403).end('Denied');
      return;
    }
    response.end(
      '{"query_id":"file-query"}\n[{"name":"ready","type":"INTEGER"}]\n[1]\n'
    );
  });
  await new Promise<void>(done => proxy.listen(0, '127.0.0.1', done));
  cleanups.push(() => new Promise<void>(done => proxy.close(() => done())));
  const server = await startFile(entry, {
    ALTERTABLE_DATA_PROXY_URL: `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`,
    ALTERTABLE_DATA_PROXY_TOKEN: 'file-dev-token',
  });

  const page = await fetch(server.url);
  const bundle = await fetch(new URL('/bundle.js', server.url));
  const query = await fetch(new URL('/api/sql', server.url), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: new URL(server.url).origin,
    },
    body: JSON.stringify({
      statement: 'SELECT $ready AS ready',
      limit: 1,
      params: { ready: 1 },
    }),
  });

  expect(page.status).toBe(200);
  expect(page.headers.get('content-type')).toContain('text/html');
  expect(await bundle.text()).toContain('Dev file marker');
  expect(await query.json()).toEqual({
    columns: [{ name: 'ready', type: 'INTEGER' }],
    rows: [[1]],
    queryId: 'file-query',
  });
  expect(proxied).toEqual({
    statement: 'SELECT $ready AS ready',
    limit: 1,
    params: { ready: 1 },
  });
});

test.each(['external', 'checkout'])(
  'dev:file rebuilds when an app or its imports change (%s)',
  async location => {
    const directory = await temporaryDirectory(
      location === 'checkout' ? process.cwd() : tmpdir()
    );
    const entry = join(directory, 'index.tsx');
    await writeFile(
      join(directory, 'label.ts'),
      "export const label = 'first';\n"
    );
    await writeFile(
      entry,
      "import { label } from './label';\ndocument.title = label;\n"
    );
    const server = await startFile(entry);
    const reloads = readReloads(server.url);
    await vi.waitFor(() => expect(reloads.join('')).toContain('ready'));

    await writeFile(
      join(directory, 'label.ts'),
      "export const label = 'second';\n"
    );
    await vi.waitFor(() => expect(reloads.join('')).toContain('reload'));
    await vi.waitFor(async () =>
      expect(
        await (await fetch(new URL('/bundle.js', server.url))).text()
      ).toContain('second')
    );

    reloads.length = 0;
    await writeFile(entry, "document.title = 'third';\n");
    await vi.waitFor(() => expect(reloads.join('')).toContain('reload'));
    await vi.waitFor(async () =>
      expect(
        await (await fetch(new URL('/bundle.js', server.url))).text()
      ).toContain('third')
    );
  }
);

test('dev:file reports unresolved imports and recovers when the missing file is created', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  await writeFile(entry, "document.title = 'valid';\n");
  const server = await startFile(entry);
  const reloads = readReloads(server.url);
  await vi.waitFor(() => expect(reloads.join('')).toContain('ready'));

  await writeFile(entry, "import { missing } from './missing';\nmissing();\n");
  await vi.waitFor(() => expect(reloads.join('')).toContain('reload'));
  const broken = await fetch(new URL('/bundle.js', server.url));

  expect(broken.status).toBe(500);
  expect(await broken.text()).toContain(`${entry}:1:`);
  expect(server.child.exitCode).toBeNull();

  await writeFile(
    join(directory, 'missing.ts'),
    "export function missing() { document.title = 'Recovered import'; }\n"
  );
  await vi.waitFor(async () => {
    const recovered = await fetch(new URL('/bundle.js', server.url));
    expect(recovered.status).toBe(200);
    expect(await recovered.text()).toContain('Recovered import');
  });
});

test('dev:file starts from a broken app and recovers once it builds', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  await writeFile(entry, 'const = ;\n');
  const server = await startFile(entry);
  const reloads = readReloads(server.url);
  await vi.waitFor(() => expect(reloads.join('')).toContain('ready'));
  expect((await fetch(new URL('/bundle.js', server.url))).status).toBe(500);

  await writeFile(entry, "document.title = 'fixed';\n");
  await vi.waitFor(() => expect(reloads.join('')).toContain('reload'));
  const fixed = await fetch(new URL('/bundle.js', server.url));

  expect(fixed.status).toBe(200);
  expect(await fixed.text()).toContain('fixed');
});

test.each(['syntax error', 'missing file', 'missing directory'] as const)(
  'dev:file recovers from an initial %s outside the entry directory',
  async failure => {
    const directory = await temporaryDirectory();
    await mkdir(join(directory, 'app'));
    if (failure !== 'missing directory') await mkdir(join(directory, 'shared'));
    const entry = join(directory, 'app/index.tsx');
    const label = join(directory, 'shared/label.ts');
    if (failure === 'syntax error')
      await writeFile(label, 'export const label = ;\n');
    await writeFile(
      entry,
      "import { label } from '../shared/label';\ndocument.title = label;\n"
    );
    const server = await startFile(entry);
    expect((await fetch(new URL('/bundle.js', server.url))).status).toBe(500);
    // Let startup filesystem events settle so only the imported file can trigger recovery.
    await new Promise(done => setTimeout(done, 1000));

    await mkdir(join(directory, 'shared'), { recursive: true });
    await writeFile(
      label,
      "export const label = 'Recovered external import';\n"
    );
    await vi.waitFor(async () => {
      const response = await fetch(new URL('/bundle.js', server.url));
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('Recovered external import');
    });
  }
);

test.each(['direct', 'inherited'] as const)(
  'dev:file recovers when a missing import uses %s tsconfig paths',
  async configType => {
    const directory = await temporaryDirectory();
    await mkdir(join(directory, 'app'));
    await mkdir(join(directory, 'shared'));
    if (configType === 'inherited') {
      await mkdir(join(directory, 'config'));
      await writeFile(
        join(directory, 'config/base.json'),
        `{
          // Targets are relative to the inherited baseUrl.
          "compilerOptions": { "baseUrl": "..", "paths": { "@shared/*": ["shared/*"] } }
        }`
      );
    }
    await writeFile(
      join(directory, 'app/tsconfig.json'),
      JSON.stringify(
        configType === 'inherited'
          ? { extends: '../config/base.json' }
          : { compilerOptions: { paths: { '@shared/*': ['../shared/*'] } } }
      )
    );
    const entry = join(directory, 'app/index.tsx');
    await writeFile(
      entry,
      "import { label } from '@shared/label';\ndocument.title = label;\n"
    );
    const server = await startFile(entry);
    expect((await fetch(new URL('/bundle.js', server.url))).status).toBe(500);
    await new Promise(done => setTimeout(done, 1000));

    await writeFile(
      join(directory, 'shared/label.ts'),
      "export const label = 'Recovered alias import';\n"
    );
    await vi.waitFor(async () => {
      const response = await fetch(new URL('/bundle.js', server.url));
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('Recovered alias import');
    });
  }
);

test('dev:file catches up after an edit missed during a reload disconnection', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  function appSource(label: string) {
    return `
import { defineDataApp } from '@altertable/data-app';
import { mountDataApp } from '@altertable/data-app/react';
const app = defineDataApp({ title: 'Preview', description: 'Preview', scope: { organization: 'test', environment: 'test' }, queries: {} });
function App() { return <h1>${label}</h1>; }
mountDataApp({ app, component: App });
`;
  }
  await writeFile(entry, appSource('Before disconnect'));
  const server = await startFile(entry);
  let disconnected = false;
  const reloadConnections = new Set<import('node:http').ServerResponse>();
  const proxy = createServer((request, response) => {
    if (request.url === '/reload' && disconnected) {
      response.destroy();
      return;
    }
    const upstream = httpRequest(
      new URL(request.url!, server.url),
      upstreamResponse => {
        response.writeHead(
          upstreamResponse.statusCode!,
          upstreamResponse.headers
        );
        if (request.url === '/reload') reloadConnections.add(response);
        upstreamResponse.pipe(response);
      }
    );
    upstream.on('error', () => response.destroy());
    response.on('close', () => {
      reloadConnections.delete(response);
      upstream.destroy();
    });
    request.pipe(upstream);
  });
  await new Promise<void>(done => proxy.listen(0, '127.0.0.1', done));
  cleanups.push(async () => {
    proxy.closeAllConnections();
    await new Promise<void>(done => proxy.close(() => done()));
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(
      `http://127.0.0.1:${(proxy.address() as AddressInfo).port}/`
    );
    const app = page.frameLocator('iframe');
    await app.getByRole('heading', { name: 'Before disconnect' }).waitFor();
    await vi.waitFor(() => expect(reloadConnections.size).toBe(1));
    await page.evaluate(() => {
      document.body.dataset.previewSession = 'connected';
    });
    const connectionFailed = page.waitForEvent('requestfailed', {
      predicate: request => new URL(request.url()).pathname === '/reload',
      timeout: 5000,
    });
    disconnected = true;
    for (const response of reloadConnections) response.destroy();
    await connectionFailed;
    await writeFile(entry, appSource('Edited while disconnected'));
    await vi.waitFor(async () =>
      expect(
        await (await fetch(new URL('/bundle.js', server.url))).text()
      ).toContain('Edited while disconnected')
    );
    expect(
      await app.getByRole('heading', { name: 'Before disconnect' }).isVisible()
    ).toBe(true);

    disconnected = false;
    await app
      .getByRole('heading', { name: 'Edited while disconnected' })
      .waitFor({ timeout: 5000 });
    expect(
      await page.locator('body').getAttribute('data-preview-session')
    ).toBe('connected');
  } finally {
    await browser.close();
  }
});

test('dev:file handles SQL body-limit responses and downloads exported blobs through its host', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  await writeFile(
    entry,
    `
import { defineDataApp } from '@altertable/data-app';
import { mountDataApp } from '@altertable/data-app/react';
import { getDataAppTransport } from '@altertable/data-app/client';
const app = defineDataApp({ title: 'Preview', description: 'Preview', scope: { organization: 'test', environment: 'test' }, queries: {} });
function App() {
  return <>
    <button onClick={async () => {
      try { await getDataAppTransport().lakehouse.queryAll('SELECT 1', { limit: 1 }); }
      catch (error) { document.querySelector('output').textContent = error.code; }
    }}>Run query</button>
    <output aria-label="Query error" />
    <button onClick={() => getDataAppTransport().request({ route: 'export:csv', payload: { filename: 'preview.csv', blob: new Blob(['Name\\r\\nMünchen\\r\\n'], { type: 'text/csv' }) } })}>Download CSV</button>
  </>;
}
mountDataApp({ app, component: App });
`
  );
  const server = await startFile(entry);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Exercise the HTTP byte limit independently of the bridge's smaller payload limit.
    await page.route('**/api/sql', route =>
      route.continue({
        postData: JSON.stringify({ statement: 'é'.repeat(50_000), limit: 1 }),
      })
    );
    await page.goto(server.url);
    const app = page.frameLocator('iframe');
    await app.getByRole('button', { name: 'Run query' }).click();
    await vi.waitFor(() =>
      expect(
        app.getByRole('status', { name: 'Query error' }).textContent()
      ).resolves.toBe('source_query_rejected')
    );
    const downloaded = page.waitForEvent('download');
    await app.getByRole('button', { name: 'Download CSV' }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('preview.csv');
    expect(await readFile((await download.path())!, 'utf8')).toBe(
      'Name\r\nMünchen\r\n'
    );
  } finally {
    await browser.close();
  }
});

test('dev:file queries the lakehouse with CLI credential names and reports its target', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  await writeFile(entry, "document.title = 'credentials';\n");
  let authorization: string | undefined;
  const api = createServer(async (request, response) => {
    for await (const _chunk of request);
    authorization = request.headers.authorization;
    response.end(
      '{"query_id":"api-query"}\n[{"name":"ready","type":"INTEGER"}]\n[1]\n'
    );
  });
  await new Promise<void>(done => api.listen(0, '127.0.0.1', done));
  cleanups.push(() => new Promise<void>(done => api.close(() => done())));
  const apiBase = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  const server = await startFile(entry, {
    ALTERTABLE_API_BASE: apiBase,
    ALTERTABLE_USERNAME: 'analyst',
    ALTERTABLE_PASSWORD: 'secret',
    ALTERTABLE_LAKEHOUSE_USERNAME: '',
    ALTERTABLE_LAKEHOUSE_PASSWORD: '',
    ALTERTABLE_DATA_PROXY_URL: '',
    ALTERTABLE_DATA_PROXY_TOKEN: '',
  });
  const query = await fetch(new URL('/api/sql', server.url), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: new URL(server.url).origin,
    },
    body: JSON.stringify({ statement: 'SELECT 1 AS ready', limit: 1 }),
  });

  expect(query.status, server.output()).toBe(200);
  expect(authorization).toBe(`Basic ${btoa('analyst:secret')}`);
  expect(server.output()).toContain(`Lakehouse: ${apiBase} as analyst`);
  expect(server.output()).not.toContain('secret');
});

test('dev:file maps missing lakehouse credentials to an unauthorized response', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  await writeFile(entry, "document.title = 'offline';\n");
  const server = await startFile(entry, {
    ALTERTABLE_DATA_PROXY_URL: '',
    ALTERTABLE_DATA_PROXY_TOKEN: '',
    ALTERTABLE_LAKEHOUSE_USERNAME: '',
    ALTERTABLE_LAKEHOUSE_PASSWORD: '',
  });
  const query = await fetch(new URL('/api/sql', server.url), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: new URL(server.url).origin,
    },
    body: JSON.stringify({ statement: 'SELECT 1', limit: 1 }),
  });

  expect(query.status).toBe(401);
  expect(await query.json()).toEqual({ reason: 'unauthorized' });
});

test('dev:dir refuses a directory without a local server', async () => {
  const directory = await temporaryDirectory();
  const command = run(['run', 'dev:dir', directory]);

  expect(await command.exited).not.toBe(0);
  expect(command.output()).toContain(join(directory, 'src/server.ts'));
  expect(command.output()).toContain('dev:file');
});

test('dev:dir serves an uninstalled local app with this checkout and restarts it on edits', async () => {
  const directory = await temporaryDirectory();
  for (const path of ['src', 'app.ts', 'package.json', 'tsconfig.json'])
    await cp(
      join('examples/starter-local-data-app', path),
      join(directory, path),
      { recursive: true }
    );
  await mkdir(join(directory, 'config'));
  await writeFile(
    join(directory, 'config/base.json'),
    JSON.stringify({
      compilerOptions: {
        paths: { 'app-config': ['../app.ts'], 'app/*': ['../*'] },
      },
    })
  );
  await writeFile(
    join(directory, 'tsconfig.json'),
    '{ // app aliases survive the preview override\n"extends": "./config/base.json", "compilerOptions": { "jsx": "react-jsx" } }'
  );
  for (const file of ['src/server.ts', 'src/App.tsx']) {
    const path = join(directory, file);
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replaceAll(
        '"#config"',
        file === 'src/server.ts' ? '"app-config"' : '"app/app"'
      )
    );
  }
  await writeFile(
    join(directory, 'setup.ts'),
    "console.log('App preload preserved');\n"
  );
  await writeFile(
    join(directory, 'bunfig.toml'),
    'preload = ["./setup.ts"]\n[serve.static]\nplugins = []\n'
  );
  const command = run(['run', 'dev:dir', directory], { PORT: '0' });
  const [, firstUrl] = await waitForOutput(
    command,
    /Getting started running at (http:\/\/127\.0\.0\.1:\d+\/)/
  );

  expect(command.output()).toContain('App preload preserved');
  const page = await fetch(firstUrl!);
  expect(page.status).toBe(200);
  const script = (await page.text()).match(/src="([^"]+\.js)"/)?.[1];
  expect(script).toBeDefined();
  const client = await fetch(new URL(script!, firstUrl));
  expect(client.status).toBe(200);
  expect(await client.text()).toContain('Getting started');

  await writeFile(
    join(directory, 'app.ts'),
    (await readFile(join(directory, 'app.ts'), 'utf8')).replace(
      'title: "Getting started"',
      'title: "Hot reloaded"'
    )
  );
  const [, reloadedUrl] = await waitForOutput(
    command,
    /Hot reloaded running at (http:\/\/127\.0\.0\.1:\d+\/)/
  );
  const reloadedPage = await fetch(reloadedUrl!);
  expect(reloadedPage.status).toBe(200);
  const reloadedScript = (await reloadedPage.text()).match(
    /src="([^"]+\.js)"/
  )?.[1];
  expect(reloadedScript).toBeDefined();
  const reloadedClient = await fetch(new URL(reloadedScript!, reloadedUrl));
  expect(reloadedClient.status).toBe(200);
  expect(await reloadedClient.text()).toContain('Hot reloaded');
  expect(command.child.exitCode).toBeNull();
});

test('dev:file replaces the rendered iframe and preserves URL filters after edits', async () => {
  const directory = await temporaryDirectory();
  const entry = join(directory, 'index.tsx');
  const label = join(directory, 'label.ts');
  await writeFile(label, "export const label = 'First preview';\n");
  await writeFile(join(directory, 'style.css'), 'h1 { color: rgb(1, 2, 3); }');
  await writeFile(
    entry,
    `
import { defineDataApp } from '@altertable/data-app';
import { mountDataApp } from '@altertable/data-app/react';
import { getDataAppNavigation } from '@altertable/data-app/client';
import { label } from './label';
import './style.css';
const app = defineDataApp({ title: 'Preview', description: 'Preview', scope: { organization: 'test', environment: 'test' }, queries: {} });
function App() {
  const navigation = getDataAppNavigation()!;
  return <><h1>{label}</h1><output aria-label="Filter">{navigation.snapshot().search}</output>
    <button onClick={() => navigation.update({ search: '?period=selected', hash: '' })}>Select period</button></>;
}
mountDataApp({ app, component: App });
`
  );
  const server = await startFile(entry);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(server.url);
    const app = page.frameLocator('iframe');
    await vi.waitFor(async () =>
      expect(
        await app.getByRole('heading', { name: 'First preview' }).isVisible(),
        errors.join('\n') + ' ' + (await page.locator('body').innerText())
      ).toBe(true)
    );
    expect(
      await app
        .getByRole('heading', { name: 'First preview' })
        .evaluate(element => getComputedStyle(element).color)
    ).toBe('rgb(1, 2, 3)');
    await app.getByRole('button', { name: 'Select period' }).click();
    await vi.waitFor(() =>
      expect(new URL(page.url()).search).toBe('?period=selected')
    );
    await writeFile(label, "export const label = 'Second preview';\n");
    await vi.waitFor(() =>
      expect(
        app.getByRole('heading', { name: 'Second preview' }).isVisible()
      ).resolves.toBe(true)
    );
    expect(
      await app.getByRole('status', { name: 'Filter' }).textContent()
    ).toBe('?period=selected');
    expect(new URL(page.url()).search).toBe('?period=selected');

    await page.route('**/bundle.js', route => route.abort());
    await writeFile(label, "export const label = 'Unavailable preview';\n");
    await vi.waitFor(() =>
      expect(
        page
          .getByText('Could not load the app bundle:', { exact: false })
          .isVisible()
      ).resolves.toBe(true)
    );
    await page.unroute('**/bundle.js');
    await writeFile(label, "export const label = 'Recovered preview';\n");
    await vi.waitFor(() =>
      expect(
        app.getByRole('heading', { name: 'Recovered preview' }).isVisible()
      ).resolves.toBe(true)
    );
    expect(
      await app.getByRole('status', { name: 'Filter' }).textContent()
    ).toBe('?period=selected');
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test('the public Bun preview serves injected data and rejects foreign requests', async () => {
  const directory = await temporaryDirectory();
  const file = join(directory, 'index.tsx');
  await writeFile(file, "document.title = 'Public preview';\n");
  const command = run([
    '--eval',
    `
import { serveAppFile } from '@altertable/data-app/server/bun/preview';
const preview = await serveAppFile({
  file: ${JSON.stringify(file)},
  port: 0,
  dependenciesFrom: process.cwd(),
  lakehouse: {
    async queryAll(statement, { limit, params }) {
      return { columns: [{ name: 'statement', type: 'VARCHAR' }], rows: [[statement]], queryId: String(params?.marker ?? limit) };
    },
  },
});
console.log(preview.url.href);
process.on('SIGTERM', async () => { await preview.stop(); process.exit(0); });
`,
  ]);
  const [url] = await waitForOutput(command, /http:\/\/127\.0\.0\.1:\d+\//);
  const origin = new URL(url!).origin;
  const body = JSON.stringify({
    statement: 'SELECT $marker',
    limit: 1,
    params: { marker: 'injected' },
  });
  const sqlUrl = new URL('/api/sql', url);
  const accepted = await fetch(sqlUrl, {
    method: 'POST',
    headers: { origin },
    body,
  });
  expect(accepted.status).toBe(200);
  expect(await accepted.json()).toEqual({
    columns: [{ name: 'statement', type: 'VARCHAR' }],
    rows: [['SELECT $marker']],
    queryId: 'injected',
  });
  const overhead = new TextEncoder().encode(
    JSON.stringify({ statement: '', limit: 1 })
  ).byteLength;
  const remaining = 100_000 - overhead;
  const statement =
    'é'.repeat(Math.floor(remaining / 2)) + 'a'.repeat(remaining % 2);
  const boundary = JSON.stringify({ statement, limit: 1 });
  expect(new TextEncoder().encode(boundary).byteLength).toBe(100_000);
  const boundaryResponse = await fetch(sqlUrl, {
    method: 'POST',
    headers: { origin },
    body: boundary,
  });
  expect(boundaryResponse.status).toBe(200);
  await boundaryResponse.arrayBuffer();
  const oversized = JSON.stringify({ statement: statement + 'a', limit: 1 });
  expect(oversized.length).toBeLessThan(100_000);
  const oversizedResponse = await fetch(sqlUrl, {
    method: 'POST',
    headers: { origin },
    body: oversized,
  });
  expect(oversizedResponse.status).toBe(413);
  expect(await oversizedResponse.json()).toEqual({ reason: 'query_rejected' });
  const earlyRejection = await new Promise<number>((done, reject) => {
    const request = httpRequest(
      sqlUrl,
      { method: 'POST', headers: { origin } },
      response => {
        response.resume();
        done(response.statusCode ?? 0);
        request.destroy();
      }
    );
    request.on('error', reject);
    request.setTimeout(3000, () =>
      request.destroy(new Error('Oversized upload waited for completion.'))
    );
    // Leave the upload open: the byte limit must reject it without waiting for EOF.
    request.write('x'.repeat(100_001));
  });
  expect(earlyRejection).toBe(413);
  const foreignHeaders: Record<string, string>[] = [
    {},
    { origin: 'https://foreign.example' },
    { origin, 'sec-fetch-site': 'cross-site' },
  ];
  for (const headers of foreignHeaders)
    expect(
      (await fetch(sqlUrl, { method: 'POST', headers, body })).status
    ).toBe(403);
  const rebound = await new Promise<number>((done, reject) => {
    const request = httpRequest(
      new URL('/bundle.js', url),
      { headers: { host: 'foreign.example' } },
      response => {
        response.resume();
        done(response.statusCode ?? 0);
      }
    );
    request.on('error', reject);
    request.end();
  });
  expect(rebound).toBe(403);
  expect(
    (await fetch(sqlUrl, { method: 'POST', headers: { origin }, body: '{' }))
      .status
  ).toBe(400);
  expect(
    (
      await fetch(sqlUrl, {
        method: 'POST',
        headers: { origin },
        body: 'x'.repeat(100_001),
      })
    ).status
  ).toBe(413);
});

test('the public Bun preview keeps remaining reload clients working and releases resources on stop', async () => {
  const directory = await temporaryDirectory();
  const file = join(directory, 'index.tsx');
  await writeFile(file, "document.title = 'Stopped preview';\n");
  const command = run([
    '--eval',
    `
import { serveAppFile } from '@altertable/data-app/server/bun/preview';
const options = {
  file: ${JSON.stringify(file)},
  port: 0,
  dependenciesFrom: process.cwd(),
  lakehouse: { async queryAll() { return { columns: [], rows: [] }; } },
};
const preview = await serveAppFile(options);
const page = await fetch(preview.url);
if (!page.ok) throw new Error('Preview host is unavailable');
await page.text();
const first = await fetch(new URL('/reload', preview.url));
const firstReader = first.body.getReader();
const firstReady = await firstReader.read();
const second = await fetch(new URL('/reload', preview.url));
const secondReader = second.body.getReader();
const secondReady = await secondReader.read();
const decoder = new TextDecoder();
if (decoder.decode(firstReady.value) !== decoder.decode(secondReady.value))
  throw new Error('Reload connections have different server sessions.');
await firstReader.cancel();
await Bun.write(options.file, "document.title = 'Reloaded after disconnect';");
if (!decoder.decode((await secondReader.read()).value).includes('data: reload'))
  throw new Error('Remaining reload connection was not notified.');
await preview.stop();
await preview.stop();
try { while (!(await secondReader.read()).done) {} } catch {}
const replacement = await serveAppFile({ ...options, port: Number(preview.url.port) });
await replacement.stop();
console.log('Preview resources released');
`,
  ]);
  expect(await command.exited, command.output()).toBe(0);
  expect(command.output()).toContain('Preview resources released');
});

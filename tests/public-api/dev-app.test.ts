import { spawn, type ChildProcess } from 'node:child_process';
import {
  cp,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';

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

async function temporaryDirectory() {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), 'data-app-dev-'))
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
    headers: { 'content-type': 'application/json' },
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

test('dev:file rebuilds and signals a reload when the app or its imports change', async () => {
  const directory = await temporaryDirectory();
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
  expect(
    await (await fetch(new URL('/bundle.js', server.url))).text()
  ).toContain('second');

  reloads.length = 0;
  await writeFile(entry, "document.title = 'third';\n");
  await vi.waitFor(() => expect(reloads.join('')).toContain('reload'));
  expect(
    await (await fetch(new URL('/bundle.js', server.url))).text()
  ).toContain('third');
});

test('dev:file keeps serving after a broken edit and reports the build error', async () => {
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
    headers: { 'content-type': 'application/json' },
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
    headers: { 'content-type': 'application/json' },
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

test('dev:dir serves an uninstalled local app with this checkout and hot reloads it', async () => {
  const directory = await temporaryDirectory();
  for (const path of ['src', 'app.ts', 'package.json', 'tsconfig.json'])
    await cp(
      join('examples/starter-local-data-app', path),
      join(directory, path),
      { recursive: true }
    );
  const command = run(['run', 'dev:dir', directory], { PORT: '0' });
  const [, firstUrl] = await waitForOutput(
    command,
    /Getting started running at (http:\/\/127\.0\.0\.1:\d+\/)/
  );

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
  await waitForOutput(command, /Hot reloaded running at http/);
  expect(command.child.exitCode).toBeNull();
});

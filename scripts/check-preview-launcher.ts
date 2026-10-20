import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

/** Exercise the launcher from a packed runtime installation, outside the checkout. */
export async function checkPreviewLauncher(runtimeDirectory: string) {
  const sourceDirectory = await mkdtemp(join(tmpdir(), 'data-app-source-'));
  const file = join(sourceDirectory, 'app.tsx');
  const command = [
    process.execPath,
    '-e',
    'await import("@altertable/data-app-examples/preview")',
  ];
  let proxied: unknown;
  const proxy = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      assert.equal(
        request.headers.get('authorization'),
        'Bearer launcher-token'
      );
      proxied = await request.json();
      return new Response(
        '{"query_id":"launcher-query"}\n[{"name":"ready","type":"INTEGER"}]\n[1]\n'
      );
    },
  });
  const environment = {
    ...process.env,
    ALTERTABLE_APP_FILE: file,
    PORT: '0',
    ALTERTABLE_DATA_PROXY_URL: proxy.url.href,
    ALTERTABLE_DATA_PROXY_TOKEN: 'launcher-token',
    ALTERTABLE_LAKEHOUSE_USERNAME: undefined,
    ALTERTABLE_LAKEHOUSE_PASSWORD: undefined,
  };
  const browser = await chromium.launch();
  try {
    // Source-adjacent installations must never override the pinned runtime.
    for (const name of [
      '@altertable/data-app',
      '@altertable/data-app-react',
      'react',
      'react-dom',
    ]) {
      const directory = join(sourceDirectory, 'node_modules', name);
      await mkdir(directory, { recursive: true });
      await writeFile(
        join(directory, 'package.json'),
        JSON.stringify({
          name,
          exports: { '.': './index.js', './*': './index.js' },
        })
      );
      await writeFile(
        join(directory, 'index.js'),
        'throw new Error("Wrong source dependency");'
      );
    }
    function source(title: string) {
      return `import { defineDataApp } from '@altertable/data-app';
import { mountDataApp } from '@altertable/data-app-react';
const app = defineDataApp({ title: 'Launcher', description: 'Packed preview', scope: { organization: 'demo', environment: 'test' }, queries: {} });
mountDataApp({ app, component: () => <h1>${title}</h1> });`;
    }
    await writeFile(file, source('Packed launcher'));
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      const child = Bun.spawn(command, {
        cwd: runtimeDirectory,
        env: environment,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const errors = new Response(child.stderr).text();
      let output = '';
      const reading = (async () => {
        for await (const chunk of child.stdout)
          output += new TextDecoder().decode(chunk);
      })();
      try {
        const deadline = Date.now() + 20_000;
        let url: string | undefined;
        while (!(url = output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0])) {
          if (Date.now() > deadline) child.kill('SIGKILL');
          if (child.exitCode !== null || Date.now() > deadline)
            throw new Error(`Launcher failed: ${output}\n${await errors}`);
          await Bun.sleep(25);
        }
        assert(output.includes(file));
        const page = await browser.newPage();
        try {
          await page.goto(url);
          const app = page.frameLocator('iframe');
          await app
            .getByRole('heading', { name: 'Packed launcher', exact: true })
            .waitFor();
          const bundle = await (await fetch(new URL('/bundle.js', url))).text();
          assert(!bundle.includes('launcher-token'));
          assert(!bundle.includes('Wrong source dependency'));
          const query = await fetch(new URL('/api/sql', url), {
            method: 'POST',
            headers: { origin: new URL(url).origin },
            body: JSON.stringify({
              statement: 'SELECT $ready AS ready',
              limit: 1,
              params: { ready: 1 },
            }),
          });
          assert.equal(query.status, 200);
          assert.deepEqual(await query.json(), {
            columns: [{ name: 'ready', type: 'INTEGER' }],
            rows: [[1]],
            queryId: 'launcher-query',
          });
          assert.deepEqual(proxied, {
            statement: 'SELECT $ready AS ready',
            limit: 1,
            params: { ready: 1 },
          });
          await writeFile(file, source('Rebuilt launcher'));
          await app
            .getByRole('heading', { name: 'Rebuilt launcher', exact: true })
            .waitFor();
          child.kill(signal);
          const code = await Promise.race([
            child.exited,
            Bun.sleep(5000).then(() => {
              throw new Error(`${signal} did not stop the launcher`);
            }),
          ]);
          assert.equal(code, 0);
          // Rebinding verifies that shutdown released the listening socket.
          const rebound = Bun.serve({
            hostname: '127.0.0.1',
            port: Number(new URL(url).port),
            fetch: () => new Response('released'),
          });
          await rebound.stop(true);
          await writeFile(file, source('Packed launcher'));
        } finally {
          await page.close();
        }
      } finally {
        if (child.exitCode === null) child.kill('SIGKILL');
        await child.exited;
        await reading;
        const stderr = await errors;
        assert.equal(stderr, '', stderr);
      }
    }
    for (const [path, message] of [
      [undefined, 'Missing ALTERTABLE_APP_FILE'],
      ['relative.tsx', 'Use an absolute file path'],
      [join(sourceDirectory, 'missing.tsx'), 'No data app file'],
    ] as const) {
      const child = Bun.spawn(command, {
        cwd: runtimeDirectory,
        env: { ...environment, ALTERTABLE_APP_FILE: path },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const stderr = await new Response(child.stderr).text();
      assert.notEqual(await child.exited, 0);
      assert(stderr.includes(message), stderr);
    }
    console.log(
      'Packed preview launcher: rendered external TSX, pinned resolution, proxy SQL, reload, SIGINT/SIGTERM cleanup verified.'
    );
  } finally {
    await browser.close();
    await proxy.stop(true);
    await rm(sourceDirectory, { recursive: true, force: true });
  }
}

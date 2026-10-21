import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { expect, test } from 'vitest';

import { packages } from '@/scripts/packages';

async function checkout() {
  const root = resolve('.');
  const temporary = await mkdtemp(join(tmpdir(), 'data-app-watcher-'));
  for (const name of ['package.json', 'tsconfig.json', 'scripts'])
    await cp(join(root, name), join(temporary, name), { recursive: true });
  await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'));
  for (const { directory } of packages) {
    for (const name of ['src', 'package.json', 'tsconfig.build.json'])
      await cp(join(root, directory, name), join(temporary, directory, name), {
        recursive: true,
      });
    await symlink(
      join(root, directory, 'node_modules'),
      join(temporary, directory, 'node_modules')
    );
  }
  return temporary;
}

// Real builds in an isolated checkout: failures and saves never edit user source.
test('package watcher publishes current linked output, retains chunks, recovers, and stops', async () => {
  const root = resolve('.');
  const temporary = await checkout();
  let watcher: ReturnType<typeof spawn> | undefined;
  let log = '';
  try {
    const core = 'packages/data-app/src/index.ts';
    const css = 'packages/data-app-react/src/styles.css';
    await writeFile(join(temporary, core), 'export const broken = ;');
    watcher = spawn('bun', ['run', 'dev'], {
      cwd: temporary,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    watcher.stdout!.on('data', data => {
      log += String(data);
    });
    watcher.stderr!.on('data', data => {
      log += String(data);
    });
    async function waitFor(event: string, generation: number) {
      await expect
        .poll(
          () =>
            log.includes(
              `DATA_APP_DEV ${JSON.stringify({ event, generation })}`
            ),
          { timeout: 30000 }
        )
        .toBe(true);
    }
    async function source(path: string, suffix: string) {
      const target = join(temporary, path);
      await writeFile(
        target,
        (await readFile(join(root, path), 'utf8')) + suffix
      );
    }
    async function run(args: string[]) {
      const child = spawn('bun', args, { cwd: temporary });
      let output = '';
      child.stdout.on('data', data => {
        output += String(data);
      });
      child.stderr.on('data', data => {
        output += String(data);
      });
      const [code] = await once(child, 'exit');
      assert.equal(code, 0, output);
      return output;
    }
    await waitFor('error', 0);
    await expect(
      readFile(join(temporary, 'packages/data-app/dist/index.js'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await source(core, '');
    await waitFor('ready', 1);
    for (const { directory, manifest } of packages)
      for (const target of Object.values(manifest.exports))
        for (const file of Object.values(target))
          expect(
            (await readFile(join(temporary, directory, file))).length
          ).toBeGreaterThan(0);

    const chunks = join(temporary, 'packages/data-app/dist/chunks');
    const oldChunks = await readdir(chunks);
    const consumer = join(temporary, 'consumer');
    await mkdir(join(consumer, 'node_modules/@altertable'), {
      recursive: true,
    });
    for (const { directory, manifest } of packages)
      await symlink(
        join(temporary, directory),
        join(consumer, 'node_modules', manifest.name)
      );
    await writeFile(
      join(consumer, 'index.ts'),
      "import { watcherProbe } from '@altertable/data-app';\nconst result: 'current' = watcherProbe();\nconsole.log(result);\n"
    );
    await source(
      core,
      "\nexport function watcherProbe(): 'current' { return 'current'; }\n"
    );
    const config = 'packages/data-app/src/core/queries.ts';
    await writeFile(
      join(temporary, config),
      (await readFile(join(root, config), 'utf8')).replace(
        'Query result must contain',
        'Watcher query result must contain'
      )
    );
    await source(css, '\n.watcher-probe { color: rgb(1, 2, 3); }\n');
    await waitFor('ready', 2);
    expect(await run(['consumer/index.ts'])).toContain('current');
    await run([
      join(root, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--noEmit',
      '--skipLibCheck',
      '--module',
      'preserve',
      '--moduleResolution',
      'bundler',
      'consumer/index.ts',
    ]);
    const reactDist = join(temporary, 'packages/data-app-react/dist');
    const reactFiles = await readdir(reactDist, { recursive: true });
    expect(
      (
        await Promise.all(
          reactFiles
            .filter(name => name.endsWith('.js'))
            .map(name => readFile(join(reactDist, name), 'utf8'))
        )
      ).some(text => text.includes('.watcher-probe'))
    ).toBe(true);
    expect(
      (await readdir(chunks)).some(file => !oldChunks.includes(file))
    ).toBe(true);
    for (const file of oldChunks)
      expect(await readFile(join(chunks, file))).toBeTruthy();
    expect(
      await readFile(
        join(temporary, 'packages/data-app-worker/dist/index.js'),
        'utf8'
      )
    ).not.toMatch(/^import\s|\bimport\s*\(/m);

    const successful = await readFile(
      join(temporary, 'packages/data-app/dist/index.js'),
      'utf8'
    );
    await source(core, '\nexport const broken = ;\n');
    await waitFor('error', 2);
    expect(
      await readFile(join(temporary, 'packages/data-app/dist/index.js'), 'utf8')
    ).toBe(successful);
    expect(await run(['consumer/index.ts'])).toContain('current');
    await source(
      core,
      "\nexport function watcherProbe(): 'current' { return 'current'; }\n"
    );
    await waitFor('ready', 3);
    await source(
      'scripts/build.ts',
      '\n// Verify build-script edits are watched.\n'
    );
    await waitFor('ready', 4);
    const exited = once(watcher, 'exit');
    watcher.kill('SIGTERM');
    expect((await exited)[0]).toBe(0);
    expect(log).toContain('"event":"stopped"');
    // Interrupt the initial build too, before it can publish readiness.
    log = '';
    watcher = spawn('bun', ['run', 'dev'], {
      cwd: temporary,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    watcher.stdout!.on('data', data => {
      log += String(data);
    });
    watcher.stderr!.on('data', data => {
      log += String(data);
    });
    await waitFor('building', 0);
    const interrupted = once(watcher, 'exit');
    watcher.kill('SIGINT');
    expect((await interrupted)[0]).toBe(0);
    expect(log).toContain('"event":"stopped"');
    expect(log).not.toContain('"event":"ready"');
    for (const { directory } of packages)
      await expect(
        readdir(join(temporary, directory, '.dev-build'))
      ).rejects.toMatchObject({ code: 'ENOENT' });
  } catch (error) {
    throw new Error(`Watcher verification failed.\n${log}`, { cause: error });
  } finally {
    if (watcher && watcher.exitCode === null) {
      const exited = once(watcher, 'exit');
      watcher.kill('SIGTERM');
      await exited;
    }
    await rm(temporary, { recursive: true, force: true });
  }
}, 120000);

test('concurrent clients share one watcher and release it without stopping peers', async () => {
  const temporary = await checkout();
  const gatePort =
    30001 +
    (createHash('sha256')
      .update(await realpath(temporary))
      .digest()
      .readUInt32BE(0) %
      25000);
  const collision = createServer(socket =>
    socket.end('unrelated local service\n')
  );
  await new Promise<void>(done =>
    collision.listen(gatePort, '127.0.0.1', done)
  );
  const workerSource = join(temporary, 'scripts/dev-watch.ts');
  await writeFile(
    workerSource,
    (await readFile(workerSource, 'utf8')).replace(
      "report('building');",
      "process.stderr.write('partial diagnostic'); setTimeout(() => process.stderr.write(' end\\n'), 500); report('building');"
    )
  );
  const clients: ReturnType<typeof start>[] = [];
  let pausedWorker: number | undefined;
  function start() {
    let output = '';
    const child = spawn('bun', ['run', 'dev'], { cwd: temporary });
    const exited = once(child, 'exit');
    child.stdout.on('data', data => {
      output += String(data);
    });
    child.stderr.on('data', data => {
      output += String(data);
    });
    const client = {
      child,
      exited,
      output: () => output,
      owner: () => output.match(/Shared watcher PID (\d+)/)?.[1],
      async wait(event: string, generation: number) {
        await expect
          .poll(
            () =>
              output.includes(
                `DATA_APP_DEV ${JSON.stringify({ event, generation })}`
              ),
            { timeout: 30000 }
          )
          .toBe(true);
      },
      async stop(signal: NodeJS.Signals = 'SIGTERM') {
        child.kill(signal);
        return (await exited)[0];
      },
    };
    return client;
  }
  try {
    const first = start();
    clients.push(first);
    const second = start();
    clients.push(second);
    await Promise.all([first.wait('ready', 1), second.wait('ready', 1)]);
    expect(first.owner()).toBe(second.owner());
    expect(
      [first, second].some(client =>
        client
          .output()
          .split('\n')
          .includes('DATA_APP_DEV {"event":"building","generation":0}')
      )
    ).toBe(true);

    expect(await first.stop()).toBe(0);
    const input = join(temporary, 'packages/data-app/src/index.ts');
    const original = await readFile(input, 'utf8');
    await writeFile(
      input,
      `${original}\nexport const sharedProbe = 'second';\n`
    );
    await second.wait('ready', 2);
    const late = start();
    clients.push(late);
    await late.wait('ready', 2);
    expect(late.owner()).toBe(second.owner());
    expect(late.output()).not.toContain('"event":"building"');
    await second.stop('SIGKILL');
    await writeFile(input, `${original}\nexport const sharedProbe = ;\n`);
    await late.wait('error', 2);
    const failed = start();
    clients.push(failed);
    await failed.wait('error', 2);
    expect(failed.output()).not.toContain('"event":"ready"');
    expect(failed.owner()).toBe(late.owner());
    await late.stop('SIGKILL');
    await writeFile(input, original);
    await failed.wait('ready', 3);
    // Losing the owner closes its stdin pipe, which also cleans up the worker.
    const worker = Number(first.output().match(/Build worker PID (\d+)/)?.[1]);
    expect(worker).toBeGreaterThan(0);
    pausedWorker = worker;
    process.kill(worker, 'SIGSTOP');
    process.kill(Number(failed.owner()), 'SIGKILL');
    expect((await failed.exited)[0]).toBe(1);
    const restarted = start();
    clients.push(restarted);
    await expect.poll(() => restarted.owner()).toBeTruthy();
    // The dead owner's worker cannot read EOF while paused. Its kernel gate must
    // keep the replacement from building until that worker finishes cleanup.
    await new Promise(done => setTimeout(done, 300));
    expect(restarted.output()).not.toContain('"event":"building"');
    process.kill(worker, 'SIGCONT');
    pausedWorker = undefined;
    await restarted.wait('ready', 1);
    expect(restarted.owner()).not.toBe(failed.owner());
    const finalWorker = Number(
      restarted.output().match(/Build worker PID (\d+)/)?.[1]
    );
    process.kill(finalWorker, 'SIGTERM');
    expect((await restarted.exited)[0]).toBe(1);
    const clean = start();
    clients.push(clean);
    await clean.wait('ready', 1);
    expect(await clean.stop()).toBe(0);
    for (const { directory } of packages)
      await expect(
        readdir(join(temporary, directory, '.dev-build'))
      ).rejects.toMatchObject({ code: 'ENOENT' });
  } catch (error) {
    throw new Error(
      clients.map(client => client.output()).join('\n--- client ---\n'),
      { cause: error }
    );
  } finally {
    collision.close();
    if (pausedWorker) process.kill(pausedWorker, 'SIGCONT');
    for (const client of clients) {
      if (client.child.exitCode === null && client.child.signalCode === null)
        await client.stop();
    }
    await rm(temporary, { recursive: true, force: true });
  }
}, 120000);

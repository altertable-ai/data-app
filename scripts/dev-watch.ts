import { readdir, stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { protocol } from '@/scripts/dev-connection';
import { cleanStaging } from '@/scripts/dev-paths';
import { packages } from '@/scripts/packages';

const root = resolve(import.meta.dir, '..');
let child: ReturnType<typeof Bun.spawn> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let building = false;
let queued = false;
let stopping = false;
let generation = 0;
let poller: ReturnType<typeof setInterval> | undefined;
let gate: Server | undefined;

function report(event: 'building' | 'ready' | 'error' | 'stopped') {
  console.log(`DATA_APP_DEV ${JSON.stringify({ event, generation })}`);
}

// Poll only build inputs: reliable for linked checkouts, atomic editor saves,
// and filesystems where native recursive watch events are unavailable.
async function snapshot() {
  const files = [
    'package.json',
    'bun.lock',
    'tsconfig.json',
    'scripts/build.ts',
    'scripts/dev-paths.ts',
    'scripts/packages.ts',
  ];
  for (const { directory } of packages) {
    files.push(`${directory}/package.json`, `${directory}/tsconfig.build.json`);
    const source = resolve(root, directory, 'src');
    try {
      for (const file of await readdir(source, {
        recursive: true,
        withFileTypes: true,
      }))
        if (file.isFile()) files.push(resolve(file.parentPath, file.name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const versions = await Promise.all(
    files.sort().map(async file => {
      try {
        const info = await stat(resolve(root, file), { bigint: true });
        return `${file}:${info.mtimeNs}:${info.ctimeNs}:${info.size}`;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return `${file}:missing`;
      }
    })
  );
  return versions.join('\n');
}
// The build worker holds this gate until its child and cleanup finish. A new
// owner can replace a crashed relay immediately, but cannot overlap its builds.
async function acquireGate() {
  const port = Number(process.env.DATA_APP_DEV_GATE_PORT);
  if (!port) return;
  const lease = createServer(socket =>
    socket.end(
      `${JSON.stringify({ protocol, role: 'worker', root, pid: process.pid, stopping })}\n`
    )
  );
  const deadline = Date.now() + 15000;
  while (!stopping) {
    try {
      await new Promise<void>((done, reject) => {
        lease.once('error', reject);
        lease.listen(port, '127.0.0.1', () => {
          lease.removeListener('error', reject);
          done();
        });
      });
      gate = lease;
      if (stopping) gate.close();
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
      if (Date.now() > deadline)
        throw new Error(
          `Package build gate at 127.0.0.1:${port} is still occupied. Stop the previous watcher or service using that port, then retry.`
        );
      await delay(100);
    }
  }
}

async function run() {
  await acquireGate();
  if (stopping) return;
  console.log(`[data-app] Build worker PID ${process.pid}`);
  let previous = await snapshot();
  if (stopping) return;
  let polling = false;
  poller = setInterval(() => {
    if (polling || stopping) return;
    polling = true;
    void snapshot()
      .then(current => {
        if (stopping || current === previous) return;
        previous = current;
        queued = true;
        clearTimeout(timer);
        timer = setTimeout(() => void rebuild(), 100);
      })
      .catch(error => {
        console.error('Could not watch package inputs:', error);
        process.exitCode = 1;
        void stop();
      })
      .finally(() => {
        polling = false;
      });
  }, 300);
  await rebuild();
}

async function rebuild() {
  if (stopping || building) return;
  building = true;
  queued = false;
  report('building');
  child = Bun.spawn([process.execPath, 'scripts/build.ts', '--development'], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await child.exited;
  child = undefined;
  building = false;
  if (stopping) return;
  if (code === 0) {
    generation++;
    report('ready');
  } else {
    report('error');
    console.error(
      'Build failed; fix the source to retry. Previous output is retained.'
    );
  }
  if (queued) {
    clearTimeout(timer);
    timer = setTimeout(() => void rebuild(), 100);
  }
}

async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(poller);
  if (process.env.DATA_APP_DEV_MANAGED) process.stdin.pause();
  clearTimeout(timer);
  child?.kill('SIGTERM');
  await child?.exited;
  for (const { directory } of packages)
    await cleanStaging(resolve(root, directory));
  gate?.close();
  if (!process.exitCode) report('stopped');
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => void stop());

if (process.env.DATA_APP_DEV_MANAGED) {
  process.stdin.on('end', () => void stop());
  process.stdin.resume();
}

await run();

import { readdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { packages } from '@/scripts/packages';

const root = resolve(import.meta.dir, '..');
let child: ReturnType<typeof Bun.spawn> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let building = false;
let queued = false;
let stopping = false;
let generation = 0;

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
let previous = await snapshot();
let polling = false;
const poller = setInterval(() => {
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
  clearTimeout(timer);
  child?.kill('SIGTERM');
  await child?.exited;
  for (const { directory } of packages) {
    await rm(resolve(root, directory, '.dev-build'), {
      recursive: true,
      force: true,
    });
    await rm(resolve(root, directory, '.tsconfig.dev.json'), { force: true });
  }
  report('stopped');
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => void stop());

await rebuild();

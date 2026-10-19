import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { copyExample } from '@altertable/data-app-examples';

const root = resolve(import.meta.dir, '..');

// Verify the starter against the already installed workspace packages.
const child = Bun.spawn(['bun', 'run', 'check'], {
  cwd: resolve(
    root,
    'packages/data-app-examples/templates/starter-local-data-app'
  ),
  stdout: 'inherit',
  stderr: 'inherit',
});
if ((await child.exited) !== 0) throw new Error('Starter check failed.');

// Linked consumers must also omit the build output just created in the source template.
const temporary = await mkdtemp(join(tmpdir(), 'data-app-starter-'));
try {
  const destination = join(temporary, 'app');
  await copyExample('starter-local-data-app', destination);
  assert(existsSync(join(destination, '.gitignore')));
  assert(existsSync(join(destination, 'package.json')));
  assert(!existsSync(join(destination, 'dist')));
  assert(!existsSync(join(destination, 'node_modules')));
} finally {
  await rm(temporary, { recursive: true, force: true });
}

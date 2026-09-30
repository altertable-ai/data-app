import { resolve } from 'node:path';

const child = Bun.spawn(['bun', 'run', 'check'], {
  cwd: resolve(import.meta.dir, '../examples/starter'),
  stdout: 'inherit',
  stderr: 'inherit',
});
const exitCode = await child.exited;
if (exitCode !== 0) throw new Error('Starter check failed.');

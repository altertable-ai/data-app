import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

// Verify the starter against the built workspace packages.
for (const [command, cwd] of [
  [['bun', 'install', '--frozen-lockfile'], root],
  [['bun', 'run', 'check'], resolve(root, 'examples/starter-local-data-app')],
] as const) {
  const child = Bun.spawn([...command], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`Starter ${command.join(' ')} failed.`);
}

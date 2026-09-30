import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

// Bun snapshots file dependencies on install. Refresh after the package build
// so a fresh checkout's starter resolves the generated public exports.
for (const [command, cwd] of [
  [['bun', 'install', '--frozen-lockfile'], root],
  [['bun', 'run', 'check'], resolve(root, 'examples/starter')],
] as const) {
  const child = Bun.spawn([...command], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`Starter ${command.join(' ')} failed.`);
}

import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import manifest from '@/package.json';

await rm('dist', { recursive: true, force: true });
const external = [
  ...Object.keys(manifest.dependencies),
  ...Object.keys(manifest.peerDependencies),
];

// Browser entries share chunks so error classes and transport helpers retain
// their identity across public entry points. Hosts do not import the app UI.
const browser = await Bun.build({
  entrypoints: [
    'src/core/contract.ts',
    'src/core/config.ts',
    'src/core/format.ts',
    'src/core/appearance.ts',
    'src/client/index.ts',
    'src/embed/index.ts',
    'src/react/index.ts',
    'src/react/embed/index.ts',
  ],
  root: 'src',
  outdir: 'dist',
  target: 'browser',
  format: 'esm',
  splitting: true,
  external,
  naming: { entry: '[dir]/[name].[ext]', chunk: 'chunks/[name]-[hash].[ext]' },
  sourcemap: 'external',
});

const results = [browser];
for (const [name, entry] of Object.entries({
  server: 'src/server/index.ts',
  local: 'src/server/local.ts',
})) {
  results.push(
    await Bun.build({
      entrypoints: [entry],
      outdir: 'dist',
      target: 'bun',
      format: 'esm',
      external,
      naming: `${name}.[ext]`,
      sourcemap: 'external',
    })
  );
}
for (const result of results) {
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error('Could not build package.');
  }
  for (const output of result.outputs) {
    if (!output.path.startsWith(join(process.cwd(), 'dist')))
      throw new Error(`Unexpected build output: ${output.path}`);
  }
}
await writeFile('dist/react.css.d.ts', 'export {};\n');

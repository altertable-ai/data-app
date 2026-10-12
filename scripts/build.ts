import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import manifest from '@/package.json';

// Watch rebuilds keep declarations and let open pages pick up the new files.
if (!process.argv.includes('--incremental'))
  await rm('dist', { recursive: true, force: true });
const external = [
  ...Object.keys(manifest.dependencies),
  ...Object.keys(manifest.peerDependencies),
];

// Compile explicit stylesheets; importing React never installs them.
async function compileStyles(entrypoint: string): Promise<string> {
  const styles = await Bun.build({
    entrypoints: [entrypoint],
    target: 'browser',
  });
  if (!styles.success) {
    for (const log of styles.logs) console.error(log);
    throw new Error(`Could not build ${entrypoint}.`);
  }
  const stylesheet = styles.outputs.find(output =>
    output.path.endsWith('.css')
  );
  if (!stylesheet) throw new Error(`${entrypoint} stylesheet is missing.`);
  return stylesheet.text();
}
const [dataAppStyles, annotationStyles] = await Promise.all([
  compileStyles('src/react/styles.css'),
  compileStyles('src/react/annotations/styles.css'),
]);

const bootstrap = await Bun.build({
  entrypoints: ['src/embed/standalone.ts'],
  target: 'browser',
  format: 'iife',
  minify: true,
});

if (!bootstrap.success) throw new Error('Could not build bootstrap.');
const bootstrapScript = await bootstrap.outputs[0]!.text();

// Browser entries share chunks so error classes and transport helpers retain
// their identity across public entry points. Hosts do not import the app UI.
const browser = await Bun.build({
  entrypoints: [
    'src/index.ts',
    'src/core/contract.ts',
    'src/core/config.ts',
    'src/core/format.ts',
    'src/core/appearance.ts',
    'src/client/index.ts',
    'src/embed/index.ts',
    'src/react/index.ts',
    'src/react/ui/index.ts',
    'src/react/embed/index.ts',
  ],
  root: 'src',
  outdir: 'dist',
  target: 'browser',
  jsx: { runtime: 'automatic', development: false },
  format: 'esm',
  splitting: true,
  define: {
    DATA_APP_BOOTSTRAP: JSON.stringify(bootstrapScript),
    DATA_APP_STYLES: JSON.stringify(dataAppStyles),
    ANNOTATION_STYLES: JSON.stringify(annotationStyles),
  },
  external,
  naming: { entry: '[dir]/[name].[ext]', chunk: 'chunks/[name]-[hash].[ext]' },
  sourcemap: 'external',
});

const worker = await Bun.build({
  entrypoints: ['src/worker/index.ts'],
  outdir: 'dist',
  target: 'browser',
  format: 'esm',
  naming: 'worker.js',
  define: {
    DATA_APP_BOOTSTRAP: JSON.stringify(bootstrapScript),
  },
});

const results = [browser, worker];
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

// The dev runner restarts only after every JavaScript output is available.
// Keep this signal outside dist: clean builds remove that directory.
await mkdir('node_modules/.cache', { recursive: true });
await writeFile(
  'node_modules/.cache/data-app-build-ready',
  crypto.randomUUID()
);

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { packages } from '@/scripts/packages';

// Package scripts can also invoke this runner from their own directory.
const root = resolve(import.meta.dir, '..');
process.chdir(root);
const selected = process.argv
  .slice(2)
  .find(argument => !argument.startsWith('--'));
if (selected && !packages.some(pkg => pkg.directory === `packages/${selected}`))
  throw new Error(`Unknown package: ${selected}`);
const incremental = process.argv.includes('--incremental');
const buildTargets = new Map<string, 'bun' | 'node'>([
  ['@altertable/data-app-bun', 'bun'],
  ['@altertable/data-app-examples', 'node'],
  ['@altertable/data-app-manifest', 'node'],
]);

async function bundle(options: Parameters<typeof Bun.build>[0]) {
  const result = await Bun.build(options);
  if (!result.success)
    throw new Error(result.logs.map(log => log.message).join('\n'));
  return result;
}

async function inline(entrypoint: string) {
  const result = await bundle({
    entrypoints: [entrypoint],
    target: 'browser',
    format: 'iife',
    minify: true,
    jsx: { runtime: 'automatic', development: false },
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return result.outputs[0]!.text();
}

for (const { directory, manifest } of packages) {
  if (selected && directory !== `packages/${selected}`) continue;
  const outdir = `${directory}/dist`;
  if (!incremental) await rm(outdir, { recursive: true, force: true });
  if (!incremental && manifest.name === '@altertable/data-app') {
    for (const name of [
      'docs',
      'AGENTS.md',
      'CONTRIBUTING.md',
      'REFERENCE.md',
    ]) {
      await rm(`${directory}/${name}`, { recursive: true, force: true });
      await cp(name, `${directory}/${name}`, {
        recursive: true,
        filter: path => !/(?:^|\/)(?:node_modules|dist)(?:\/|$)/.test(path),
      });
    }
  }
  const define: Record<string, string> = {};
  const external = [
    ...Object.keys('dependencies' in manifest ? manifest.dependencies : {}),
    ...Object.keys(
      'peerDependencies' in manifest ? manifest.peerDependencies : {}
    ),
  ];
  if (manifest.name === '@altertable/data-app-embed') {
    const bootstrap = await inline(`${directory}/src/standalone.ts`);
    define.DATA_APP_BOOTSTRAP = JSON.stringify(bootstrap);
  }
  if (manifest.name === '@altertable/data-app-react') {
    for (const [constant, entry] of Object.entries({
      DATA_APP_STYLES: 'styles.css',
      ANNOTATION_STYLES: 'annotations/styles.css',
    })) {
      const styles = await bundle({
        entrypoints: [`${directory}/src/${entry}`],
        target: 'browser',
      });
      const stylesheet = styles.outputs.find(output =>
        output.path.endsWith('.css')
      );
      if (!stylesheet) throw new Error(`Missing stylesheet: ${entry}`);
      define[constant] = JSON.stringify(await stylesheet.text());
    }
  }
  if (manifest.name === '@altertable/data-app-bun') {
    const script = (await inline(`${directory}/src/preview/host.tsx`)).replace(
      /<\/script/gi,
      '<\\/script'
    );
    const html = (
      await Bun.file(`${directory}/src/preview/host.html`).text()
    ).replace(
      '<script type="module" src="./host.tsx"></script>',
      () => `<script>${script}</script>`
    );
    define.DATA_APP_PREVIEW_HTML = JSON.stringify(html);
  }
  const entrypoints = Object.values(manifest.exports).map(
    target =>
      `${directory}/src/${target.import.slice('./dist/'.length).replace(/\.js$/, '.ts')}`
  );
  await bundle({
    entrypoints,
    root: `${directory}/src`,
    outdir,
    target: buildTargets.get(manifest.name) ?? 'browser',
    jsx: { runtime: 'automatic', development: false },
    format: 'esm',
    splitting: manifest.name !== '@altertable/data-app-worker',
    external,
    define,
    naming: {
      entry: '[dir]/[name].[ext]',
      chunk: 'chunks/[name]-[hash].[ext]',
    },
    sourcemap: 'external',
  });
  if (!incremental) {
    const tsc = Bun.spawn(
      [
        'bun',
        'x',
        '--no-install',
        'tsc',
        '-p',
        `${directory}/tsconfig.build.json`,
      ],
      {
        stdout: 'inherit',
        stderr: 'inherit',
      }
    );
    if ((await tsc.exited) !== 0)
      throw new Error(`Declarations failed: ${manifest.name}`);
    const declarations = `${directory}/dist/types`;
    for await (const file of new Bun.Glob('**/*.d.ts').scan(declarations)) {
      const path = `${declarations}/${file}`;
      const source = await Bun.file(path).text();
      await Bun.write(
        path,
        source
          .replace(/^import\s+['"][^'"]+\.css['"];\s*$/gm, '')
          .replace(/(['"])(\.[^'"]+)\.tsx?\1/g, '$1$2.js$1')
      );
    }
  }
}
await mkdir('node_modules/.cache', { recursive: true });
await writeFile(
  'node_modules/.cache/data-app-build-ready',
  crypto.randomUUID()
);

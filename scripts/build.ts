import { cp, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { build } from 'tsdown';

import { staging, declarationConfig, cleanStaging } from '@/scripts/dev-paths';
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
const development = process.argv.includes('--development');
if (development)
  for (const { directory } of packages) await cleanStaging(directory);
async function markReady() {
  await mkdir('node_modules/.cache', { recursive: true });
  await writeFile(
    'node_modules/.cache/data-app-build-ready',
    crypto.randomUUID()
  );
}

if (!selected && !incremental && !development) {
  const build = Bun.spawn(
    ['bun', 'run', '--filter', '@altertable/*', 'build'],
    {
      cwd: root,
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );
  if ((await build.exited) !== 0) throw new Error('Workspace build failed.');
  await markReady();
  process.exit(0);
}

const buildTargets = new Map<string, 'bun' | 'node'>([
  ['@altertable/data-app-bun', 'bun'],
  ['@altertable/data-app-examples', 'node'],
  ['@altertable/data-app-manifest', 'node'],
]);

const aliases: Record<string, string> = {};
const declarationPaths: Record<string, string[]> = {};

async function bundle(options: Parameters<typeof Bun.build>[0]) {
  const result = await Bun.build({
    ...options,
    plugins: development
      ? [
          {
            name: 'staged-workspace',
            setup(builder) {
              builder.onResolve({ filter: /^@altertable\// }, ({ path }) => {
                if (
                  options.external?.some(
                    name => path === name || path.startsWith(`${name}/`)
                  )
                )
                  return { path, external: true };
                if (aliases[path]) return { path: aliases[path] };
                return undefined;
              });
            },
          },
        ]
      : [],
  });
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
  const outdir = development
    ? resolve(staging(directory), 'dist')
    : `${directory}/dist`;
  if (development) {
    // Matching package exports let TypeScript name inferred types from staged
    // dependencies without leaking temporary paths into public declarations.
    await mkdir(staging(directory), { recursive: true });
    await cp(
      resolve(directory, 'package.json'),
      resolve(staging(directory), 'package.json')
    );
  }
  if (!incremental) await rm(outdir, { recursive: true, force: true });
  if (
    !incremental &&
    !development &&
    manifest.name === '@altertable/data-app'
  ) {
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
  const entry = Object.fromEntries(
    Object.values(manifest.exports).map(target => {
      const name = target.import.slice('./dist/'.length).replace(/\.js$/, '');
      return [name, resolve(directory, 'src', `${name}.ts`)];
    })
  );
  const specialized =
    manifest.name === '@altertable/data-app-bun' ||
    manifest.name === '@altertable/data-app-worker';
  if (specialized) {
    await bundle({
      entrypoints: Object.values(entry),
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
  }
  let tsconfig = 'tsconfig.build.json';
  if (development) {
    tsconfig = declarationConfig(directory);
    await mkdir(staging(directory), { recursive: true });
    await writeFile(
      tsconfig,
      JSON.stringify({
        extends: resolve(directory, 'tsconfig.build.json'),
        compilerOptions: {
          rootDir: resolve(directory, 'src'),
          paths: { '@/*': [resolve(root, '*')], ...declarationPaths },
        },
      })
    );
  }
  if (!specialized || !incremental) {
    await build({
      config: false,
      cwd: resolve(directory),
      entry,
      outDir: resolve(outdir),
      tsconfig,
      platform: buildTargets.has(manifest.name) ? 'node' : 'browser',
      target: false,
      fixedExtension: false,
      format: 'esm',
      clean: false,
      deps: { neverBundle: true },
      define,
      dts: incremental
        ? false
        : {
            generator: 'tsgo',
            tsgo: { path: resolve('node_modules/.bin/tsc') },
            emitDtsOnly: specialized,
          },
      sourcemap: true,
      outputOptions: {
        entryFileNames: chunk =>
          chunk.name.endsWith('.d') ? 'types/[name].ts' : '[name].js',
        chunkFileNames: chunk =>
          chunk.name.endsWith('.d')
            ? 'types/chunks/[name].ts'
            : 'chunks/[name]-[hash].js',
      },
    });
  }
  if (development) {
    await rm(tsconfig);
    for (const [subpath, target] of Object.entries(manifest.exports)) {
      const name = manifest.name + (subpath === '.' ? '' : subpath.slice(1));
      aliases[name] = resolve(outdir, target.import.slice('./dist/'.length));
      declarationPaths[name] = [
        resolve(outdir, target.types.slice('./dist/'.length)),
      ];
    }
  }
}
if (development) {
  // Publish dependencies before entries, retaining old hashed chunks for in-flight
  // consumers. Rename each file so readers never see partially written output.
  const pending: { source: string; target: string; entry: boolean }[] = [];
  for (const { directory, manifest } of packages) {
    const source = resolve(staging(directory), 'dist');
    const entries = new Set(
      Object.values(manifest.exports).map(target =>
        target.import.slice('./dist/'.length)
      )
    );
    for (const file of await readdir(source, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!file.isFile()) continue;
      const relative = resolve(file.parentPath, file.name).slice(
        source.length + 1
      );
      pending.push({
        source: resolve(source, relative),
        target: resolve(directory, 'dist', relative),
        entry: entries.has(relative),
      });
    }
  }
  pending.sort((a, b) => Number(a.entry) - Number(b.entry));
  for (const { source, target } of pending) {
    await mkdir(resolve(target, '..'), { recursive: true });
    await rename(source, target);
  }
  for (const { directory } of packages) await cleanStaging(directory);
}
if (!selected) await markReady();

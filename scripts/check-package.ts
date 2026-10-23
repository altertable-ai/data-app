import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix, resolve } from 'node:path';

import workspace from '@/package.json';
import { checkPreviewLauncher } from '@/scripts/check-preview-launcher';
import { packages } from '@/scripts/packages';

const root = process.cwd();
const bunVersion = (await readFile(join(root, '.bun-version'), 'utf8')).trim();
assert.equal(workspace.packageManager, `bun@${bunVersion}`);
// Outside the checkout: neither hoisted dependencies nor repository aliases can help.
const temporary = await mkdtemp(join(tmpdir(), 'data-app-packages-'));

async function run(command: string[], cwd = temporary) {
  const child = Bun.spawn(command, {
    cwd,
    env: { ...process.env, npm_config_cache: join(temporary, 'npm-cache') },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0)
    throw new Error(`${command.join(' ')} failed:\n${stdout}${stderr}`);
  return stdout;
}

async function install(directory: string, dependencies: string[]) {
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ private: true, type: 'module' })
  );
  await run(
    [
      'npm',
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      ...dependencies,
    ],
    directory
  );
  const tree = JSON.parse(
    await run(['npm', 'ls', '--all', '--json'], directory)
  );
  const names = new Set<string>();
  function visit(node: { dependencies?: Record<string, typeof node> }) {
    for (const [name, child] of Object.entries(node.dependencies ?? {})) {
      // npm ls includes an empty record for an absent optional peer.
      if (Object.keys(child).length) names.add(name);
      visit(child);
    }
  }
  visit(tree);
  return names;
}

function excludes(names: Set<string>, forbidden: string[]) {
  for (const name of [
    ...forbidden,
    'typescript',
    '@altertable/data-app-manifest',
  ])
    assert(!names.has(name), `Unexpected installed dependency: ${name}`);
}

async function typecheck(directory: string, source: string) {
  await writeFile(join(directory, 'consumer.ts'), source);
  for (const [module, moduleResolution] of [
    ['Preserve', 'bundler'],
    ['NodeNext', 'NodeNext'],
  ]) {
    await writeFile(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ESNext',
          module,
          moduleResolution,
          strict: true,
          noEmit: true,
          types: [],
        },
        include: ['consumer.ts'],
      })
    );
    await run(
      [
        join(root, 'node_modules/.bin/tsc'),
        '-p',
        join(directory, 'tsconfig.json'),
      ],
      directory
    );
  }
}

try {
  const archives = new Map<string, string>();
  for (const { directory, manifest } of packages) {
    const packed = JSON.parse(
      await run(
        ['npm', 'pack', '--json', '--pack-destination', temporary],
        resolve(root, directory)
      )
    ) as [{ filename: string; files: { path: string }[]; size: number }];
    const archive = packed[0];
    const paths = new Set(archive.files.map(file => file.path));
    for (const target of Object.values(manifest.exports)) {
      for (const path of Object.values(target))
        assert(paths.has(path.slice(2)), `${manifest.name}: missing ${path}`);
    }
    if ('bin' in manifest)
      for (const path of Object.values(manifest.bin))
        assert(
          paths.has(path.replace(/^\.\//, '')),
          `${manifest.name}: missing bin ${path}`
        );
    for (const path of ['README.md', 'LICENSE'])
      assert(paths.has(path), `${manifest.name}: missing ${path}`);
    assert.equal(
      paths.has('THIRD_PARTY_NOTICES'),
      manifest.name === '@altertable/data-app-react',
      `${manifest.name}: only React ships the vendored d3 notices`
    );
    assert(
      ![...paths].some(path => /^(src|tests)\//.test(path)),
      'Source or tests leaked into archive'
    );
    const unpacked = join(temporary, 'unpacked', manifest.name);
    await mkdir(unpacked, { recursive: true });
    await run([
      'tar',
      '-xzf',
      join(temporary, archive.filename),
      '-C',
      unpacked,
      '--strip-components=1',
    ]);
    const published = JSON.parse(
      await readFile(join(unpacked, 'package.json'), 'utf8')
    );
    assert(
      !JSON.stringify(published).includes('workspace:'),
      'Unresolved workspace version'
    );
    if (manifest.name === '@altertable/data-app') {
      for (const path of [
        'AGENTS.md',
        'REFERENCE.md',
        'CONTRIBUTING.md',
        'docs/app-authoring.md',
      ])
        assert(paths.has(path), `Missing authoring material: ${path}`);
      const reference = await readFile(join(unpacked, 'REFERENCE.md'), 'utf8');
      assert.equal(
        reference,
        await readFile(join(root, 'REFERENCE.md'), 'utf8'),
        'Packed API reference differs from the canonical reference'
      );
      for (const name of [
        'defineDataApp',
        'defineOperation',
        'connectionCheck',
        'createDataClient',
        'createDataHooks',
        'DataApp',
        'LineChart',
        'AnnotationTarget',
      ])
        assert(
          reference.includes(`\n${name} (`),
          `Missing authoring API: ${name}`
        );
      for (const name of [
        'createDataHandler',
        'createIframeTransport',
        'createMessageRouter',
        'sqlQueryRoute',
        'AnnotationBar',
        'startDataAppBootstrap',
      ])
        assert(
          !reference.includes(`\n${name} (`),
          `Host API in authoring reference: ${name}`
        );
    }
    if (manifest.name === '@altertable/data-app-examples') {
      for (const path of [
        'templates/starter-data-app/index.tsx',
        'templates/starter-local-data-app/package.json',
        'templates/starter-local-data-app/.bun-version',
        'templates/starter-local-data-app/_gitignore',
        'templates/starter-local-data-app/.node-version',
        'templates/starter-local-data-app/.oxlintrc.json',
        'templates/starter-local-data-app/.oxfmtrc.json',
        'templates/starter-local-data-app/AGENTS.md',
        'templates/starter-local-data-app/src/server.ts',
      ])
        assert(paths.has(path), `Missing starter file: ${path}`);
      assert(
        ![...paths].some(
          path =>
            /(?:^|\/)(?:node_modules|dist|\.env[^/]*)(?:\/|$)/.test(path) &&
            path.startsWith('templates/')
        ),
        'Build artifacts leaked into templates'
      );
    }
    if (manifest.name === '@altertable/data-app')
      assert(
        ![...paths].some(path => path.startsWith('examples/')),
        'Starters belong in the examples package'
      );
    for (const path of paths) {
      if (path.endsWith('.md')) {
        const markdown = await readFile(join(unpacked, path), 'utf8');
        for (const [, href] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
          if (!href || /^(?:https?:|#)/.test(href)) continue;
          const target = href.split('#')[0];
          assert(
            !target || paths.has(posix.join(posix.dirname(path), target)),
            `Broken packaged documentation link: ${path} -> ${href}`
          );
        }
      }
      if (!path.endsWith('.d.ts')) continue;
      const declaration = await readFile(join(unpacked, path), 'utf8');
      assert(
        !declaration.includes('@/'),
        `Repository alias leaked into ${path}`
      );
      for (const [, specifier] of declaration.matchAll(
        /\b(?:from|import)\s*(?:\(\s*)?["'](\.[^"']+)["']/g
      )) {
        const target = posix
          .join(posix.dirname(path), specifier!)
          .replace(/\.js$/, '.d.ts');
        assert(
          paths.has(target),
          `Broken declaration: ${manifest.name}/${path} -> ${specifier}`
        );
      }
    }
    archives.set(manifest.name, join(temporary, archive.filename));
    console.log(`${manifest.name}: ${archive.size} packed bytes`);
  }
  function archive(name: string) {
    const result = archives.get(`@altertable/data-app${name}`);
    assert(result, `Missing archive: ${name}`);
    return result;
  }
  const uiDependencies = [
    '@altertable/lakehouse',
    '@floating-ui/react',
    '@tanstack/react-query',
    'react-aria-components',
    'recharts',
    'lucide-react',
    'fflate',
    'fuzzysort',
    'html-to-image',
    'get-tsconfig',
  ];
  const manifestOnly = join(temporary, 'manifest-only');
  const manifestNames = await install(manifestOnly, [archive('-manifest')]);
  assert.deepEqual([...manifestNames].sort(), [
    '@altertable/data-app-manifest',
    'typescript',
  ]);
  await typecheck(
    manifestOnly,
    `
import { extractDataAppManifest, overrideDataAppManifest, type DataAppManifest, type DataAppLiteralValue } from '@altertable/data-app-manifest';
const result = extractDataAppManifest('');
if (result.manifest) {
  const manifest: DataAppManifest = result.manifest;
  const value: DataAppLiteralValue = manifest.title;
  const diagnostics: [] = result.diagnostics;
  void [value, diagnostics];
}
const override = overrideDataAppManifest('', { title: 'Sales' });
if (override.source !== null) {
  const source: string = override.source;
  const diagnostics: [] = override.diagnostics;
  void [source, diagnostics];
}
// @ts-expect-error The API accepts only the source string.
extractDataAppManifest('', 'app.tsx');
`
  );
  await run(
    [
      'node',
      join(manifestOnly, 'node_modules/typescript/bin/tsc'),
      '-p',
      join(manifestOnly, 'tsconfig.json'),
    ],
    manifestOnly
  );
  await writeFile(
    join(manifestOnly, 'manifest-consumer.ts'),
    await readFile(join(root, 'tests/fixtures/manifest-consumer.ts'), 'utf8')
  );
  await writeFile(
    join(manifestOnly, 'verify.mjs'),
    `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { verifyManifestConsumer } from './manifest-consumer.ts';
const require = createRequire(import.meta.resolve('@altertable/data-app-manifest'));
assert.equal(require('typescript/package.json').version, '5.9.3');
verifyManifestConsumer();
`
  );
  for (const runtime of ['node', 'bun'])
    await run([runtime, join(manifestOnly, 'verify.mjs')], manifestOnly);
  const manifestBundle = join(manifestOnly, 'verify-bundle.js');
  await run(
    [
      'bun',
      'build',
      join(manifestOnly, 'verify.mjs'),
      '--target=node',
      '--outfile',
      manifestBundle,
    ],
    manifestOnly
  );
  for (const runtime of ['node', 'bun'])
    await run([runtime, manifestBundle], manifestOnly);
  // Hoisting must preserve the root compiler while the extractor owns TS5.
  await run(
    [
      'node',
      '--input-type=module',
      '-e',
      `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const root = createRequire(${JSON.stringify(join(root, 'package.json'))});
assert.equal(root('typescript/package.json').version, ${JSON.stringify(workspace.devDependencies.typescript)});
for (const name of ['data-app', 'data-app-react', 'data-app-bun', 'data-app-embed', 'data-app-worker', 'data-app-examples', 'data-app-manifest']) {
  const local = createRequire(import.meta.resolve('@altertable/' + name));
  assert.equal(local('typescript/package.json').version, name === 'data-app-manifest' ? '5.9.3' : ${JSON.stringify(workspace.devDependencies.typescript)});
}
`,
    ],
    root
  );
  console.log(
    'Manifest-only archive: TypeScript 5, portable types, Node and Bun scope/literal contract; no runtime/UI dependencies.'
  );
  const examples = join(temporary, 'examples');
  const exampleNames = await install(examples, [archive('-examples')]);
  assert.deepEqual([...exampleNames], ['@altertable/data-app-examples']);
  await typecheck(
    examples,
    `export { dataAppExamples, getExampleDirectory, copyExample, type DataAppExampleId } from '@altertable/data-app-examples';`
  );
  const catalog = JSON.parse(
    await run(
      [
        'node',
        '--input-type=module',
        '-e',
        `
import assert from 'node:assert/strict';
import { dataAppExamples, getExampleDirectory } from '@altertable/data-app-examples';
assert.throws(() => getExampleDirectory('../escape'), /Unknown data app example/);
console.log(JSON.stringify(dataAppExamples.map(example => ({...example, directory: getExampleDirectory(example.id)}))));
`,
      ],
      examples
    )
  ) as { id: string; mode: string; directory: string }[];
  assert.deepEqual(
    catalog.map(({ id, mode }) => ({ id, mode })),
    [
      { id: 'starter-data-app', mode: 'hosted' },
      { id: 'starter-local-data-app', mode: 'local' },
    ]
  );
  const localExample = catalog.find(example => example.mode === 'local');
  assert(localExample);
  const local = join(temporary, 'local-starter');
  await run(
    [
      'node',
      '--input-type=module',
      '-e',
      `
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { copyExample, getExampleDirectory } from '@altertable/data-app-examples';
const destination = process.argv[1];
const source = resolve(getExampleDirectory('starter-local-data-app'));
// A missing packaged source fails during copying, after destination creation.
await rename(source, source + '-missing');
try {
  await assert.rejects(copyExample('starter-local-data-app', destination), {code: 'ENOENT'});
  assert(!existsSync(destination), 'Failed copying left its destination behind');
} finally {
  await rename(source + '-missing', source);
}
// A filename collision fails during restoration after the source has been copied.
await mkdir(join(source, '.gitignore'));
await writeFile(join(source, '.gitignore', 'sentinel'), 'collision');
try {
  await assert.rejects(copyExample('starter-local-data-app', destination));
  assert(!existsSync(destination), 'Failed renaming left its destination behind');
} finally {
  await rm(join(source, '.gitignore'), {recursive: true, force: true});
}
await copyExample('starter-data-app', process.argv[1] + '-hosted');
assert((await readFile(join(process.argv[1] + '-hosted', 'index.tsx'), 'utf8')).length > 0);
await copyExample('starter-local-data-app', process.argv[1]);
assert.equal(await readFile(join(process.argv[1], '.gitignore'), 'utf8'), 'node_modules/\\ndist/\\n.env*\\n');
await writeFile(join(destination, 'sentinel'), 'keep me');
await assert.rejects(copyExample('starter-local-data-app', destination), /exist/i);
assert.equal(await readFile(join(destination, 'sentinel'), 'utf8'), 'keep me');
await assert.rejects(copyExample('../escape', process.argv[1]), /Unknown data app example/);
`,
      local,
    ],
    examples
  );
  // Exercise a copied project against this release's tarballs, outside workspace hoisting.
  await run(
    [
      'npm',
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--no-save',
      archive(''),
      archive('-react'),
      archive('-bun'),
    ],
    local
  );
  await run(['bun', 'run', 'check'], local);
  const base = join(temporary, 'base');
  const baseNames = await install(base, [archive('')]);
  excludes(baseNames, [...uiDependencies, 'react', 'react-dom', '@types/bun']);
  await run(
    [
      'node',
      '--input-type=module',
      '-e',
      `
    import { defineDataApp } from '@altertable/data-app';
    import { createDataClient } from '@altertable/data-app/client';
    import { createDataHandler } from '@altertable/data-app/server';
    if ([defineDataApp, createDataClient, createDataHandler].some(value => typeof value !== 'function')) throw new Error('Portable exports unavailable');
  `,
    ],
    base
  );
  await typecheck(
    base,
    `export { defineDataApp } from '@altertable/data-app';
export { createDataClient } from '@altertable/data-app/client';
export { createDataHandler } from '@altertable/data-app/server';`
  );
  console.log(
    `Base consumer: ${baseNames.size} installed dependency names; no React or server adapter.`
  );
  const embedOnly = join(temporary, 'embed-only');
  excludes(await install(embedOnly, [archive(''), archive('-embed')]), [
    ...uiDependencies,
    'react',
    'react-dom',
  ]);
  await run(
    [
      'node',
      '--input-type=module',
      '-e',
      `import { attachDataAppBridge } from '@altertable/data-app-embed'; if (typeof attachDataAppBridge !== 'function') throw new Error('Embed unavailable');`,
    ],
    embedOnly
  );
  await typecheck(embedOnly, `export * from '@altertable/data-app-embed';`);
  const reactHost = join(temporary, 'react-host');
  excludes(
    await install(reactHost, [archive(''), archive('-embed'), 'react@19.2.0']),
    [...uiDependencies, 'react-dom']
  );
  await run(
    [
      'node',
      '--input-type=module',
      '-e',
      `import { DataAppBridge } from '@altertable/data-app-embed/react'; if (typeof DataAppBridge !== 'function') throw new Error('React embed unavailable');`,
    ],
    reactHost
  );
  const authoring = join(temporary, 'react-authoring');
  const authoringNames = await install(authoring, [
    archive(''),
    archive('-react'),
    'react@19.2.0',
    'react-dom@19.2.0',
    '@types/react@19.3.0',
    '@types/react-dom@19.3.0',
  ]);
  excludes(authoringNames, [
    'bun',
    '@types/bun',
    '@altertable/lakehouse',
    'get-tsconfig',
    '@altertable/data-app-bun',
    '@altertable/data-app-embed',
    '@altertable/data-app-worker',
  ]);
  await typecheck(
    authoring,
    `export { defineDataApp } from '@altertable/data-app';
export { createDataHooks, Grid, MetricWidget } from '@altertable/data-app-react';
export { MetricWidget as StaticMetric } from '@altertable/data-app-react/ui';`
  );
  await writeFile(
    join(authoring, 'app.jsx'),
    `import React from 'react';
import { renderToString } from 'react-dom/server';
import { MetricWidget } from '@altertable/data-app-react/ui';
const html = renderToString(<MetricWidget label="Authoring only" value={0} format={{kind:'count'}} />);
if (!html.includes('Authoring only') || !html.includes('>0<')) throw new Error('Authoring render failed');`
  );
  await run(['bun', join(authoring, 'app.jsx')], authoring);
  await run(
    [
      'bun',
      'build',
      join(authoring, 'app.jsx'),
      '--target=browser',
      '--outdir',
      join(authoring, 'dist'),
    ],
    authoring
  );
  const bunOnly = join(temporary, 'bun-only');
  excludes(await install(bunOnly, [archive(''), archive('-bun')]), [
    '@altertable/data-app-embed',
    ...uiDependencies.filter(
      name => !['@altertable/lakehouse', 'get-tsconfig'].includes(name)
    ),
    'react',
    'react-dom',
  ]);
  await run(
    [
      'bun',
      '-e',
      `import { localLakehouse } from '@altertable/data-app-bun';
import { serveAppFile } from '@altertable/data-app-bun/preview';
if (typeof localLakehouse !== 'function' || typeof serveAppFile !== 'function') throw new Error('Bun exports unavailable');`,
    ],
    bunOnly
  );
  const workerOnly = join(temporary, 'worker-only');
  const workerNames = await install(workerOnly, [archive('-worker')]);
  assert.deepEqual([...workerNames], ['@altertable/data-app-worker']);
  await run(
    [
      'node',
      '--input-type=module',
      '-e',
      `import worker from '@altertable/data-app-worker'; if (typeof worker.fetch !== 'function') throw new Error('Worker unavailable');`,
    ],
    workerOnly
  );
  await typecheck(
    workerOnly,
    `export { default } from '@altertable/data-app-worker';`
  );
  await install(temporary, [
    ...archives.values(),
    'react@19.2.0',
    'react-dom@19.2.0',
    '@types/react@19.3.0',
    '@types/react-dom@19.3.0',
    `@types/bun@${workspace.devDependencies['@types/bun']}`,
  ]);
  const previewRuntime = join(temporary, 'preview-runtime');
  const previewNames = await install(previewRuntime, [
    archive(''),
    archive('-react'),
    archive('-bun'),
    'react@19.2.0',
    'react-dom@19.2.0',
  ]);
  assert(!previewNames.has('@altertable/data-app-examples'));
  await checkPreviewLauncher(previewRuntime);
  // Bun's isolated linker places the launcher away from root runtime
  // dependencies; the launcher's resolution base must still be this project.
  // Use absolute archive references so Bun does not encode npm's relative
  // tarball paths as `..` segments in its isolated package store.
  await writeFile(
    join(previewRuntime, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        '@altertable/data-app': archive(''),
        '@altertable/data-app-react': archive('-react'),
        '@altertable/data-app-bun': archive('-bun'),
        react: '19.2.0',
        'react-dom': '19.2.0',
      },
      // Resolve internal dependencies from this release before it is published.
      overrides: { '@altertable/data-app': archive('') },
    })
  );
  await rm(join(previewRuntime, 'node_modules'), { recursive: true });
  await run(
    ['bun', 'install', '--ignore-scripts', '--linker=isolated'],
    previewRuntime
  );
  await checkPreviewLauncher(previewRuntime);
  const hostedExample = catalog.find(example => example.mode === 'hosted');
  assert(hostedExample);
  await writeFile(
    join(temporary, 'hosted.tsx'),
    await readFile(join(hostedExample.directory, 'index.tsx'), 'utf8')
  );
  await writeFile(
    join(temporary, 'browser.tsx'),
    `import { defineDataApp } from "@altertable/data-app";
import { createDataClient } from "@altertable/data-app/client";
import { Grid, injectDataAppStyles } from '@altertable/data-app-react';
import { MetricWidget } from '@altertable/data-app-react/ui';
injectDataAppStyles();
import { defineDateRangeContract, createMessageRouter, defineMessageRoute } from "@altertable/data-app/contract";
import { attachDataAppBridge, startDataAppBootstrap } from "@altertable/data-app-embed";
import { DataAppBridge } from "@altertable/data-app-embed/react";
export const app = defineDataApp({ title: "Packed app", description: "Portable declaration", scope: { organization: "demo", environment: "test" }, queries: {} });
export const api = { defineDataApp, createDataClient, Grid, MetricWidget, defineDateRangeContract, createMessageRouter, defineMessageRoute, attachDataAppBridge, startDataAppBootstrap, DataAppBridge };
`
  );
  await writeFile(
    join(temporary, 'embed.tsx'),
    `import { DataAppBridge } from "@altertable/data-app-embed/react";
export { DataAppBridge };
`
  );
  await writeFile(
    join(temporary, 'preview-app.tsx'),
    `import { MetricWidget } from '@altertable/data-app-react/ui';
import { DataAppBridge } from '@altertable/data-app-embed/react';
document.title = 'Packed preview';
console.log(MetricWidget, DataAppBridge);\n`
  );
  await writeFile(
    join(temporary, 'server.ts'),
    `import { defineDataApp } from "@altertable/data-app";
import { createDataHandler } from "@altertable/data-app/server";
import { localLakehouse } from "@altertable/data-app-bun";
import { serveAppFile, runAppFilePreview, type AppFilePreview } from "@altertable/data-app-bun/preview";
const runner: () => Promise<AppFilePreview> = runAppFilePreview;
if (typeof runner !== "function") throw new Error("Preview runner is unavailable");
if (typeof serveAppFile !== "function") throw new Error("Preview export is unavailable");
if (typeof createDataHandler !== "function" || typeof localLakehouse !== "function")
  throw new Error("Server exports are unavailable");
const app = defineDataApp({ title: "Server app", description: "Declare an app on the server.", scope: { organization: "demo", environment: "test" }, queries: {} });
if (typeof app.defineOperation !== "function") throw new Error("App declaration is unavailable on the server");
const preview = await serveAppFile({
  file: new URL('./preview-app.tsx', import.meta.url).pathname,
  port: 0,
  lakehouse: { async queryAll() { return { columns: [], rows: [] }; } },
});
try {
  const page = await fetch(preview.url);
  if (!page.ok || !(await page.text()).includes('<script>')) throw new Error('Packed preview host is unavailable');
  const bundle = await fetch(new URL('/bundle.js', preview.url));
  if (!bundle.ok || !(await bundle.text()).includes('Packed preview')) throw new Error('Packed preview bundle is unavailable');
  const query = await fetch(new URL('/api/sql', preview.url), {
    method: 'POST',
    headers: { origin: preview.url.origin },
    body: JSON.stringify({ statement: 'SELECT 1', limit: 1 }),
  });
  if (!query.ok) throw new Error('Packed preview SQL is unavailable');
  await query.json();
} finally { await preview.stop(); }
`
  );
  for (const name of ['exploration.types.ts', 'dimension-sources.types.ts'])
    await writeFile(
      join(temporary, name),
      await readFile(join(root, 'tests/public-api', name), 'utf8')
    );
  await writeFile(
    join(temporary, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ESNext',
        module: 'Preserve',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        noUncheckedIndexedAccess: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noImplicitOverride: true,
        allowUnreachableCode: false,
        noUncheckedSideEffectImports: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include: [
        'browser.tsx',
        'embed.tsx',
        'server.ts',
        'hosted.tsx',
        'exploration.types.ts',
        'dimension-sources.types.ts',
      ],
    })
  );
  await run([
    join(root, 'node_modules/.bin/tsc'),
    '-p',
    join(temporary, 'tsconfig.json'),
  ]);
  await run(['bun', join(temporary, 'server.ts')], temporary);
  const workerAsset = await readFile(
    join(temporary, 'node_modules/@altertable/data-app-worker/dist/index.js'),
    'utf8'
  );
  if (/^import\s|\bimport\s*\(/m.test(workerAsset))
    throw new Error('Worker must have no runtime imports.');
  if (
    /react-query|react-dom|Bun\.|process\.|createSourceFile|typescript/.test(
      workerAsset
    )
  )
    throw new Error('Worker contains unsupported runtime dependencies.');
  await run(
    [
      'node',
      '--input-type=module',
      '-e',
      'import("@altertable/data-app/server").then(module => { if (typeof module.createDataHandler !== "function") process.exit(1) })',
    ],
    temporary
  );

  const embed = await Bun.build({
    entrypoints: [join(temporary, 'embed.tsx')],
    target: 'browser',
    external: ['react'],
  });
  if (!embed.success) throw new Error('Packed React embedding build failed.');
  if (embed.outputs.some(output => output.path.endsWith('.css')))
    throw new Error('Embedding entry unexpectedly imports CSS.');
  const hostSource = await embed.outputs[0]!.text();
  if (
    /react-query|lucide-react|react-aria-components|@floating-ui/.test(
      hostSource
    )
  )
    throw new Error('Embedding entry includes app UI dependencies.');

  await writeFile(
    join(temporary, 'bootstrap.ts'),
    `import { startDataAppBootstrap } from '@altertable/data-app-embed';
startDataAppBootstrap({ parentOrigin: 'https://host.example' });
`
  );
  const bootstrap = await Bun.build({
    entrypoints: [join(temporary, 'bootstrap.ts')],
    target: 'browser',
    format: 'iife',
  });
  if (!bootstrap.success) throw new Error('Packed bootstrap build failed.');
  const bootstrapSource = await bootstrap.outputs[0]!.text();
  if (
    /createAppLocation|attachNavigation|replaceState|pushState|navigation\.update/.test(
      bootstrapSource
    )
  )
    throw new Error('Bootstrap bundle includes app navigation behavior.');

  const browser = await Bun.build({
    entrypoints: [join(temporary, 'browser.tsx')],
    outdir: join(temporary, 'browser-dist'),
    target: 'browser',
    external: ['react', 'react-dom'],
  });
  if (!browser.success)
    throw new Error(
      `Packed browser build failed: ${browser.logs.map(log => log.message).join('\n')}`
    );
  const outputs = browser.outputs.map(output => output.path);
  if (outputs.some(path => path.endsWith('.css')))
    throw new Error('Packed browser build emitted a separate stylesheet.');
  const javascript = await Promise.all(
    outputs
      .filter(path => path.endsWith('.js'))
      .map(path => readFile(path, 'utf8'))
  );
  for (const component of [
    'grid',
    'data-widget',
    'metric-widget',
    'visualization-widget-content',
    'skeleton',
    'content-skeleton',
  ]) {
    if (!javascript.some(source => source.includes(`.altertable-${component}`)))
      throw new Error(
        `Packed browser build omitted injected ${component} styles.`
      );
  }

  const hosted = await Bun.build({
    entrypoints: [join(temporary, 'hosted.tsx')],
    target: 'browser',
    format: 'iife',
  });
  if (
    !hosted.success ||
    hosted.outputs.some(output => output.path.endsWith('.css'))
  )
    throw new Error(
      'Packed hosted example must build as one JavaScript bundle.'
    );

  await writeFile(
    join(temporary, 'tree-shaking.tsx'),
    `import { Grid } from '@altertable/data-app-react';
export { Grid };
`
  );
  const shaken = await Bun.build({
    entrypoints: [join(temporary, 'tree-shaking.tsx')],
    target: 'browser',
    minify: true,
    external: ['react', 'react-dom'],
  });
  if (!shaken.success) throw new Error('Packed tree-shaking build failed.');
  const shakenSource = await shaken.outputs[0]!.text();
  if (!shakenSource.includes('altertable-grid'))
    throw new Error('Tree-shaking removed the used Grid component.');
  if (/data-altertable-styles|\.altertable-grid/.test(shakenSource))
    throw new Error('Tree-shaking retained unused style injection.');
  for (const source of [...javascript, hostSource, bootstrapSource]) {
    if (
      /\bBun\.(?:serve|build|spawn)|node:fs|serveAppFile|DATA_APP_PREVIEW_HTML|data-app-preview-dependencies/.test(
        source
      )
    )
      throw new Error('Bun preview runtime leaked into a browser entry.');
  }
  if (
    [...javascript, hostSource, bootstrapSource].some(source =>
      /typescript|createSourceFile|extractDataAppManifest|validateDataApp|operationValidationChecks|Validation timed out/.test(
        source
      )
    )
  )
    throw new Error(
      'Manifest or proactive validation tooling leaked into the browser build.'
    );
  if (javascript.some(source => source.includes('ALTERTABLE_DATA_PROXY_TOKEN')))
    throw new Error('Server credentials leaked into the browser build.');
  if (
    [await hosted.outputs[0]!.text(), bootstrapSource].some(source =>
      /TraceMap|originalPositionFor|sourceMappingURL=data:application/.test(
        source
      )
    )
  )
    throw new Error(
      'Host source mapping leaked into an app or bootstrap bundle.'
    );
  await writeFile(
    join(temporary, 'minimum.jsx'),
    `
import React from 'react';
import * as ReactDOM from 'react-dom';
import { renderToString } from 'react-dom/server';
import { MetricWidget } from '@altertable/data-app-react/ui';
import { injectDataAppStyles } from '@altertable/data-app-react';
if (typeof document !== 'undefined' || typeof injectDataAppStyles !== 'function')
  throw new Error('React styles must be importable without a DOM');
if (React.version !== '19.2.0' || ReactDOM.version !== '19.2.0' || typeof React.useEffectEvent !== 'function')
  throw new Error('Minimum React consumer resolved the wrong peers');
const html = renderToString(<MetricWidget label="Minimum React" value={0} format={{ kind: 'count' }} />);
if (!html.includes('Minimum React') || !html.includes('>0<')) throw new Error('Minimum React render failed');
`
  );
  await run(['bun', join(temporary, 'minimum.jsx')], temporary);
  const minimumBuild = await Bun.build({
    entrypoints: [join(temporary, 'minimum.jsx')],
    target: 'browser',
  });
  if (!minimumBuild.success)
    throw new Error(
      `Minimum React browser build failed: ${minimumBuild.logs.map(log => log.message).join('\n')}`
    );
  console.log(
    'Packed documentation, exports, declarations, explicit styles, tree-shaking, and server imports verified.'
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}

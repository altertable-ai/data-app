import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import workspace from '@/package.json';
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
  for (const name of forbidden)
    assert(!names.has(name), `Unexpected installed dependency: ${name}`);
}

async function typecheck(directory: string, source: string) {
  await writeFile(join(directory, 'consumer.ts'), source);
  await writeFile(
    join(directory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ESNext',
        module: 'Preserve',
        moduleResolution: 'bundler',
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
        'CONTRIBUTING.md',
        'docs/app-authoring.md',
        'examples/starter-data-app/index.tsx',
        'examples/starter-local-data-app/package.json',
      ])
        assert(paths.has(path), `Missing authoring material: ${path}`);
    }
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
  const bunOnly = join(temporary, 'bun-only');
  excludes(
    await install(bunOnly, [archive(''), archive('-embed'), archive('-bun')]),
    [
      ...uiDependencies.filter(
        name => !['@altertable/lakehouse', 'get-tsconfig'].includes(name)
      ),
      'react',
      'react-dom',
    ]
  );
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
    '@types/bun@1.4.2',
  ]);
  await writeFile(
    join(temporary, 'hosted.tsx'),
    await readFile(
      join(
        temporary,
        'node_modules/@altertable/data-app/examples/starter-data-app/index.tsx'
      ),
      'utf8'
    )
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
import { serveAppFile } from "@altertable/data-app-bun/preview";
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
      include: ['browser.tsx', 'embed.tsx', 'server.ts', 'hosted.tsx'],
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
  if (/react-query|react-dom|Bun\.|process\./.test(workerAsset))
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
  if (javascript.some(source => source.includes('ALTERTABLE_DATA_PROXY_TOKEN')))
    throw new Error('Server credentials leaked into the browser build.');
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

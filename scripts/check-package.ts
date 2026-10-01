import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { tmpdir } from 'node:os';
import manifest from '@/package.json';

const root = process.cwd();
const bunVersion = (await readFile(join(root, '.bun-version'), 'utf8')).trim();
if (manifest.packageManager !== `bun@${bunVersion}`)
  throw new Error('packageManager must match .bun-version.');
const temporary = await mkdtemp(join(root, '.package-check-'));
const minimumConsumer = await mkdtemp(
  join(tmpdir(), 'data-app-minimum-react-')
);

async function run(
  command: string[],
  cwd = root,
  extraEnv: Record<string, string> = {}
) {
  const child = Bun.spawn(command, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0)
    throw new Error(`${command.join(' ')} failed:\n${stdout}${stderr}`);

  return stdout;
}

try {
  const packed = JSON.parse(
    await run(
      ['npm', 'pack', '--json', '--pack-destination', temporary],
      root,
      { npm_config_cache: join(temporary, 'npm-cache') }
    )
  ) as [{ filename: string; files: { path: string }[] }];
  const archive = packed[0];
  if (!archive) throw new Error('npm pack did not produce an archive.');
  const paths = new Set(archive.files.map(file => file.path));
  const required = [
    'AGENTS.md',
    'dist/server.js',
    'dist/types/client/index.d.ts',
    'dist/types/server/index.d.ts',
    'dist/types/react/index.d.ts',
    'CONTRIBUTING.md',
    'docs/app-authoring.md',
    'docs/hosted-apps.md',
    'docs/local-data-apps.md',
    'docs/contract.md',
    'docs/client.md',
    'docs/react.md',
    'docs/server.md',
    'docs/server-bun.md',
    'docs/embed.md',
    'docs/react-embed.md',
    'docs/worker.md',
    'examples/starter-data-app/index.tsx',
  ];
  for (const value of Object.values(manifest.exports)) {
    for (const path of Object.values(value)) required.push(path.slice(2));
  }
  for (const path of required) {
    if (!paths.has(path)) throw new Error(`Package is missing ${path}`);
  }
  if (
    [...paths].some(
      path => path.startsWith('src/') || path.startsWith('tests/')
    )
  )
    throw new Error('Package contains source or tests.');

  const packageDirectory = join(
    temporary,
    'node_modules',
    '@altertable',
    'data-app'
  );
  await mkdir(packageDirectory, { recursive: true });
  await run([
    'tar',
    '-xzf',
    join(temporary, archive.filename),
    '-C',
    packageDirectory,
    '--strip-components=1',
  ]);
  for (const path of paths) {
    if (path.endsWith('.d.ts')) {
      const declaration = await readFile(join(packageDirectory, path), 'utf8');
      if (declaration.includes('@/'))
        throw new Error(`Repository alias leaked into ${path}`);
      for (const [, specifier] of declaration.matchAll(
        /\b(?:from|import)\s*(?:\(\s*)?["'](\.[^"']+)["']/g
      )) {
        if (!specifier) continue;
        const target = posix
          .join(posix.dirname(path), specifier)
          .replace(/\.js$/, '.d.ts');
        if (!paths.has(target))
          throw new Error(`Broken declaration import: ${path} -> ${specifier}`);
      }
    }
    if (!path.endsWith('.md')) continue;
    const markdown = await readFile(join(packageDirectory, path), 'utf8');
    for (const [, href] of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      if (!href || /^(?:https?:|#)/.test(href)) continue;
      const target = href.split('#')[0];
      if (target && !paths.has(posix.join(posix.dirname(path), target)))
        throw new Error(
          `Broken packaged documentation link: ${path} -> ${href}`
        );
    }
  }
  await writeFile(
    join(temporary, 'browser.tsx'),
    `import { createDataClient } from "@altertable/data-app/client";
import { Grid, DataAppSkeleton, injectDataAppStyles } from "@altertable/data-app/react";
injectDataAppStyles();
import { defineDateRangeContract, createMessageRouter, defineMessageRoute } from "@altertable/data-app/contract";
import { attachDataAppBridge, startDataAppBootstrap } from "@altertable/data-app/embed";
import { DataAppBridge } from "@altertable/data-app/react/embed";
export const api = { createDataClient, Grid, DataAppSkeleton, defineDateRangeContract, createMessageRouter, defineMessageRoute, attachDataAppBridge, startDataAppBootstrap, DataAppBridge };
`
  );
  await writeFile(
    join(temporary, 'embed.tsx'),
    `import { DataAppBridge } from "@altertable/data-app/react/embed";
export { DataAppBridge };
`
  );
  await writeFile(
    join(temporary, 'bridge.ts'),
    `import { attachDataAppBridge } from "@altertable/data-app/embed";
import { createMessageRouter, defineMessageRoute, MessageRoutingError } from "@altertable/data-app/contract";
const events = new EventTarget();
const sent = [];
const target = { postMessage(message) { sent.push(message); } };
const iframe = Object.assign(new EventTarget(), { contentWindow: target });
const host = Object.assign(events, { location: { search: "", hash: "" } });
const router = createMessageRouter({ "test:denied": defineMessageRoute({ input() { return null; }, output() { return null; } }) }, {
  "test:denied"() { throw new MessageRoutingError("forbidden", "Denied", "request"); }
});
const bridgeHost = attachDataAppBridge({ iframe, window: host, connection: { type: "origin", origin: "https://app.example" }, onMessage: router.dispatch });
function receive(message) {
  events.dispatchEvent(Object.assign(new Event("message"), {
    source: target, origin: "https://app.example", data: { channel: "altertable:data-app", version: 1, documentId: "document", ...message }
  }));
}
try {
  receive({ type: "bridge:ready" });
  const sessionId = sent.at(-1).sessionId;
  receive({ type: "bridge:request", sessionId, id: "call", route: "test:denied", payload: null });
  await new Promise(resolve => setTimeout(resolve, 0));
  const response = sent.at(-1);
  if (response.code !== "forbidden" || response.message !== "Denied" || response.requestId !== "request")
    throw new Error("Public routed errors lost identity across packed entries");
} finally { bridgeHost.dispose(); }
`
  );
  await writeFile(
    join(temporary, 'server.ts'),
    `import { createDataHandler } from "@altertable/data-app/server";
import { localLakehouse } from "@altertable/data-app/server/bun";
if (typeof createDataHandler !== "function" || typeof localLakehouse !== "function")
  throw new Error("Server exports are unavailable");
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
        noEmit: true,
        skipLibCheck: true,
      },
      include: [
        'browser.tsx',
        'embed.tsx',
        'server.ts',
        'node_modules/@altertable/data-app/examples/starter-data-app/index.tsx',
      ],
    })
  );
  await run([
    join(root, 'node_modules/.bin/tsc'),
    '-p',
    join(temporary, 'tsconfig.json'),
  ]);
  await run(['bun', join(temporary, 'server.ts')], temporary);
  await run(['bun', join(temporary, 'bridge.ts')], temporary);
  await writeFile(
    join(temporary, 'worker-asset.mjs'),
    `import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { strict as assert } from 'node:assert';

const asset = await readFile(new URL(import.meta.resolve('@altertable/data-app/worker')), 'utf8');
assert(!/^import\\s|\\bimport\\s*\\(/m.test(asset), 'Worker must have no runtime imports');
assert(!/react-query|react-dom|attachNavigation|createAppLocation|Bun\\.|process\\./.test(asset));
// Simulate loading the one uploaded ESM module; consumers only resolve/read it.
const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(asset).toString('base64'));
const response = await worker.fetch(new Request('https://test-report-app-1.example.test/'), {
  DOMAIN_NAME: 'example.test', PARENT_ORIGINS: 'https://host.example',
});
assert.equal(response.status, 200);
const html = await response.text();
assert(html.includes('data-parent-origin="https://host.example"'));
const source = html.match(/<script\\b[^>]*>([\\s\\S]*?)<\\/script\\b[^>]*>/i)[1];
assert(!/createAppLocation|attachNavigation|replaceState|pushState|navigation:update/.test(source));

function execute(parentOrigin) {
  const sent = [];
  const listeners = new Map();
  const parent = { postMessage(message, origin) { sent.push({ message, origin }); } };
  const frame = {
    parent,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
  };
  runInNewContext(source, {
    document: { currentScript: { dataset: { parentOrigin } } },
    window: frame,
    URL,
    crypto: { randomUUID() { return 'document'; } },
  });
  return { sent, listeners, parent, frame };
}

assert.throws(() => execute(undefined), /Missing trusted parent origin/);
assert.throws(() => execute('https://host.example/path'), /Expected an exact parent origin/);
const { sent, listeners, parent } = execute('https://host.example');
const message = { channel: 'altertable:data-app', version: 1, type: 'bridge:connect', documentId: 'host', token: 'token' };
listeners.get('message')({ origin: 'https://other.example', source: parent, data: message });
assert.equal(sent.length, 0);
listeners.get('message')({ origin: 'https://host.example', source: {}, data: message });
assert.equal(sent.length, 0);
listeners.get('message')({ origin: 'https://host.example', source: parent, data: message });
assert.equal(sent.length, 1);
assert.equal(sent[0].origin, 'https://host.example');
assert.equal(sent[0].message.type, 'bridge:ready');
assert.equal(sent[0].message.token, 'token');
assert.equal(sent[0].message.documentId, 'document');
`
  );
  await run(['node', join(temporary, 'worker-asset.mjs')], temporary);
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
    `import { startDataAppBootstrap } from '@altertable/data-app/embed';
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
  if (!javascript.some(source => source.includes('.altertable-grid')))
    throw new Error('Packed browser build omitted injected React styles.');

  const hosted = await Bun.build({
    entrypoints: [
      join(packageDirectory, 'examples/starter-data-app/index.tsx'),
    ],
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
    join(temporary, 'shell.tsx'),
    `import { DataAppSkeleton, injectDataAppShellStyles } from '@altertable/data-app/react';
injectDataAppShellStyles();
export { DataAppSkeleton };
`
  );
  const shell = await Bun.build({
    entrypoints: [join(temporary, 'shell.tsx')],
    target: 'browser',
    minify: true,
    external: ['react', 'react-dom'],
  });
  if (!shell.success) throw new Error('Packed shell build failed.');
  const shellSource = await shell.outputs[0]!.text();
  if (!shellSource.includes('.altertable-data-app-skeleton'))
    throw new Error('Packed shell build omitted skeleton styles.');
  for (const component of [
    'grid',
    'data-widget',
    'metric-widget',
    'visualization-widget-content',
    'content-skeleton',
  ]) {
    if (!shellSource.includes(`.altertable-${component}`))
      throw new Error(`Packed shell build omitted shared ${component} styles.`);
  }
  if (
    /\.altertable-(button|combobox|data-table|date-range-picker)\b|data-altertable-styles/.test(
      shellSource
    )
  )
    throw new Error('Packed shell build retained full UI styles.');

  await writeFile(
    join(temporary, 'tree-shaking.tsx'),
    `import { Grid } from '@altertable/data-app/react';
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
  if (javascript.some(source => source.includes('ALTERTABLE_DATA_PROXY_TOKEN')))
    throw new Error('Server credentials leaked into the browser build.');
  await writeFile(
    join(minimumConsumer, 'package.json'),
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
      join(temporary, archive.filename),
      'react@19.2.0',
      'react-dom@19.2.0',
    ],
    minimumConsumer,
    { npm_config_cache: join(temporary, 'npm-cache') }
  );
  await writeFile(
    join(minimumConsumer, 'minimum.jsx'),
    `
import React from 'react';
import * as ReactDOM from 'react-dom';
import { renderToString } from 'react-dom/server';
import { MetricWidget, injectDataAppStyles } from '@altertable/data-app/react';
if (typeof document !== 'undefined' || typeof injectDataAppStyles !== 'function')
  throw new Error('React styles must be importable without a DOM');
if (React.version !== '19.2.0' || ReactDOM.version !== '19.2.0' || typeof React.useEffectEvent !== 'function')
  throw new Error('Minimum React consumer resolved the wrong peers');
const html = renderToString(<MetricWidget label="Minimum React" value={0} format={{ kind: 'count' }} />);
if (!html.includes('Minimum React') || !html.includes('>0<')) throw new Error('Minimum React render failed');
`
  );
  await run(['bun', join(minimumConsumer, 'minimum.jsx')], minimumConsumer);
  const minimumBuild = await Bun.build({
    entrypoints: [join(minimumConsumer, 'minimum.jsx')],
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
  await rm(minimumConsumer, { recursive: true, force: true });
  await rm(temporary, { recursive: true, force: true });
}

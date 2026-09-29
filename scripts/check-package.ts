import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import manifest from '@/package.json';

const root = process.cwd();
const bunVersion = (await readFile(join(root, '.bun-version'), 'utf8')).trim();
if (manifest.packageManager !== `bun@${bunVersion}`)
  throw new Error('packageManager must match .bun-version.');
const temporary = await mkdtemp(join(root, '.package-check-'));

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
    'docs/starter-agent-instructions.md',
  ];
  for (const value of Object.values(manifest.exports)) {
    for (const path of Object.values(value)) required.push(path.slice(2));
  }
  for (const entry of Object.keys(manifest.exports)) {
    const name = entry
      .slice(2)
      .replace('/styles.css', '-styles')
      .replaceAll('/', '-');
    required.push(`docs/${name}.md`);
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
    `import "@altertable/data-app/react/styles.css";
import { createDataClient } from "@altertable/data-app/client";
import { Grid } from "@altertable/data-app/react";
import { defineDateRangeContract, createMessageRouter, defineMessageRoute } from "@altertable/data-app/contract";
import { attachDataAppShell, startDataAppBootstrap } from "@altertable/data-app/embed";
import { DataAppShell, DataAppBridge } from "@altertable/data-app/react/embed";
export const api = { createDataClient, Grid, defineDateRangeContract, createMessageRouter, defineMessageRoute, attachDataAppShell, startDataAppBootstrap, DataAppShell, DataAppBridge };
`
  );
  await writeFile(
    join(temporary, 'embed.tsx'),
    `import { DataAppShell } from "@altertable/data-app/react/embed";
export { DataAppShell };
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
const router = createMessageRouter({ denied: defineMessageRoute({ input() { return null; }, output() { return null; } }) }, {
  denied() { throw new MessageRoutingError("forbidden", "Denied", "request"); }
});
const dispose = attachDataAppBridge({ iframe, window: host, connection: { type: "origin", origin: "https://app.example" }, onMessage: router.dispatch });
function receive(message) {
  events.dispatchEvent(Object.assign(new Event("message"), {
    source: target, origin: "https://app.example", data: { channel: "altertable:data-app", version: 1, documentId: "document", ...message }
  }));
}
try {
  receive({ type: "ready" });
  const sessionId = sent.at(-1).sessionId;
  receive({ type: "request", sessionId, id: "call", route: "denied", payload: null });
  await new Promise(resolve => setTimeout(resolve, 0));
  const response = sent.at(-1);
  if (response.code !== "forbidden" || response.message !== "Denied" || response.requestId !== "request")
    throw new Error("Public routed errors lost identity across packed entries");
} finally { dispose(); }
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
      include: ['browser.tsx', 'embed.tsx', 'server.ts'],
    })
  );
  await run([
    join(root, 'node_modules/.bin/tsc'),
    '-p',
    join(temporary, 'tsconfig.json'),
  ]);
  await run(['bun', join(temporary, 'server.ts')], temporary);
  await run(['bun', join(temporary, 'bridge.ts')], temporary);
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
  if (!outputs.some(path => path.endsWith('.css')))
    throw new Error('Packed browser build omitted React styles.');
  const javascript = await Promise.all(
    outputs
      .filter(path => path.endsWith('.js'))
      .map(path => readFile(path, 'utf8'))
  );
  if (javascript.some(source => source.includes('ALTERTABLE_DATA_PROXY_TOKEN')))
    throw new Error('Server credentials leaked into the browser build.');
  console.log(
    'Packed documentation, exports, declarations, browser CSS, and server imports verified.'
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}

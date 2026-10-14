import { existsSync, statSync, watch, type FSWatcher } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import checkoutDependencies, {
  previewLakehouseEnvironment,
  ensurePackageBuild,
  checkoutRoot,
} from '@/scripts/dev-resolve';

const usage =
  'Usage: bun run dev:file <path>\nThe file must be a single-file data app such as examples/starter-data-app/index.tsx. Use `bun run dev:dir <path>` for a local app directory.';
const argument = process.argv[2];
if (!argument) {
  console.error(usage);
  process.exit(1);
}
const appFile = resolve(process.env.INIT_CWD ?? process.cwd(), argument);
if (!existsSync(appFile) || !statSync(appFile).isFile()) {
  console.error(`No data app file at ${appFile}.\n${usage}`);
  process.exit(1);
}
await ensurePackageBuild();
const [{ default: hostPage }, { localLakehouse }, contract] = await Promise.all(
  [
    import('@/scripts/dev-file-host.html'),
    import('@altertable/data-app/server/bun'),
    import('@altertable/data-app/contract'),
  ]
);

type Bundle = { javascript: string } | { error: string };

/** Bundle like the hosted runtime: one classic script with its styles injected. */
async function buildApp(
  entry: string
): Promise<{ bundle: Bundle; inputFiles?: string[] }> {
  try {
    const result = await Bun.build({
      entrypoints: [entry],
      target: 'browser',
      format: 'iife',
      define: { 'import.meta.env': '{}' },
      // The data document has an opaque origin, so the map cannot be fetched separately.
      sourcemap: 'inline',
      plugins: [checkoutDependencies],
      metafile: true,
    });
    const metafile: unknown = result.metafile;
    const { inputs: graph = {} } = (
      typeof metafile === 'string' ? JSON.parse(metafile) : (metafile ?? {})
    ) as { inputs?: Record<string, unknown> };
    const inputs = Object.keys(graph)
      .map(path => resolve(path))
      .filter(
        path =>
          !path.startsWith(`${checkoutRoot}/dist/`) &&
          !path.includes('/node_modules/')
      );
    const inputFiles = [entry, ...inputs];
    const script = result.outputs.find(output => output.path.endsWith('.js'));
    if (!script) throw new Error('App build did not produce JavaScript.');
    const javascript = await script.text();
    const stylesheet = result.outputs.find(output =>
      output.path.endsWith('.css')
    );
    if (!stylesheet) return { bundle: { javascript }, inputFiles };
    const css = await stylesheet.text();
    // Append rather than prepend so source map line offsets stay aligned.
    return {
      inputFiles,
      bundle: {
        javascript: `${javascript}\n{ const style = document.createElement('style'); style.textContent = ${JSON.stringify(css)}; document.head.append(style); }`,
      },
    };
  } catch (error) {
    const errors: unknown[] =
      error instanceof AggregateError ? error.errors : [error];
    return { bundle: { error: errors.map(formatBuildError).join('\n\n') } };
  }
}

function formatBuildError(error: unknown) {
  const { message, position } = error as Partial<BuildMessage>;
  if (!message) return String(error);
  return position
    ? `${message}\n  at ${position.file}:${position.line}:${position.column}\n  ${position.lineText}`
    : message;
}

const initialBuild = await buildApp(appFile);
let currentBundle = initialBuild.bundle;
let watchedFiles = new Set(initialBuild.inputFiles ?? [appFile]);
if ('error' in currentBundle) console.error(currentBundle.error);

const sessionId = crypto.randomUUID();
const clients = new Set<ReadableStreamDefaultController<string>>();
let rebuildQueue = Promise.resolve();
let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildQueue = rebuildQueue.then(async () => {
      const result = await buildApp(appFile);
      currentBundle = result.bundle;
      if (result.inputFiles) watchedFiles = new Set(result.inputFiles);
      if ('error' in currentBundle) console.error(currentBundle.error);
      else console.log(`Rebuilt ${appFile}`);
      updateWatchers();
      for (const client of clients) client.enqueue('data: reload\n\n');
    });
  }, 50);
}

// Watch directories rather than files so editors that save by renaming still trigger rebuilds.
const watchers = new Map<string, FSWatcher>();
function updateWatchers() {
  const directories = new Set([...watchedFiles].map(dirname));
  for (const [directory, watcher] of watchers)
    if (!directories.has(directory)) {
      watcher.close();
      watchers.delete(directory);
    }
  for (const directory of directories)
    if (!watchers.has(directory))
      watchers.set(
        directory,
        watch(directory, (_event, filename) => {
          // New files can repair unresolved imports after a failed build.
          if (
            'error' in currentBundle ||
            !filename ||
            watchedFiles.has(join(directory, filename))
          )
            scheduleRebuild();
        })
      );
}
updateWatchers();

const { environment, target: lakehouseTarget } = previewLakehouseEnvironment();
const lakehouse = localLakehouse(environment);
const statuses = {
  unauthorized: 401,
  forbidden: 403,
  rate_limited: 429,
  query_rejected: 400,
  unavailable: 502,
} as const;

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 25937),
  development: { hmr: true },
  idleTimeout: 60,
  routes: { '/': hostPage },
  async fetch(request, server) {
    const path = new URL(request.url).pathname;
    if (path === '/bundle.js')
      return 'error' in currentBundle
        ? new Response(currentBundle.error, { status: 500 })
        : new Response(currentBundle.javascript, {
            headers: { 'content-type': 'text/javascript; charset=utf-8' },
          });
    if (path === '/reload') {
      server.timeout(request, 0);
      return new Response(
        new ReadableStream<string>({
          start(client) {
            clients.add(client);
            client.enqueue(`event: ready\ndata: ${sessionId}\n\n`);
            request.signal.addEventListener('abort', () =>
              clients.delete(client)
            );
          },
        }),
        {
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
          },
        }
      );
    }
    if (path === '/api/sql' && request.method === 'POST') {
      let query;
      try {
        query = contract.sqlQueryRoute.input(await request.json());
      } catch {
        return Response.json({ reason: 'query_rejected' }, { status: 400 });
      }
      try {
        return Response.json(
          await lakehouse.queryAll(query.statement, {
            limit: query.limit,
            params: query.params,
            signal: request.signal,
          })
        );
      } catch (error) {
        if (error instanceof contract.DataSourceError)
          return Response.json(
            { reason: error.reason },
            { status: statuses[error.reason] }
          );
        console.error(error);
        return Response.json({ reason: 'unavailable' }, { status: 502 });
      }
    }
    return new Response('Not found', { status: 404 });
  },
});
console.log(`Data app ${appFile} running at ${server.url}\n${lakehouseTarget}`);

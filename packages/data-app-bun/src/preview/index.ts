import {
  readRequestBody,
  RequestBodyTooLargeError,
} from '@altertable/data-app/internal';
import { createReloadChannel } from '../reload-channel.ts';
import { existsSync, statSync, watch, type FSWatcher } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { type BunPlugin } from 'bun';
import {
  getTsconfig,
  createPathsMatcher,
  type PathsMatcher,
} from 'get-tsconfig';
import {
  DataSourceError,
  sqlQueryRoute,
  type Lakehouse,
} from '@altertable/data-app/contract';

declare const DATA_APP_PREVIEW_HTML: string;

export type AppFilePreviewOptions = {
  /** Absolute path to the app source. */
  file: string;
  /** Localhost port. Use 0 to select an available port. Defaults to 25837. */
  port?: number;
  /** Server-only query backend; the caller owns credentials and profile selection. */
  lakehouse: Lakehouse;
};

export type AppFilePreview = {
  url: URL;
  /** Stop serving, close reload connections, and release all file watchers. */
  stop(): Promise<void>;
};

/** Preview a single-file app in the hosted sandbox. Requires the Bun runtime. */
export async function serveAppFile({
  file: appFile,
  port = 25837,
  lakehouse,
}: AppFilePreviewOptions): Promise<AppFilePreview> {
  if (
    !isAbsolute(appFile) ||
    !existsSync(appFile) ||
    !statSync(appFile).isFile()
  )
    throw new Error(
      `No data app file at ${appFile}. Use an absolute file path.`
    );
  const packageBuildDirectory = dirname(
    Bun.resolveSync('@altertable/data-app', import.meta.dir)
  );
  let stopped = false;
  type Bundle = { javascript: string } | { error: string };

  function isAppInput(path: string) {
    return (
      !path.startsWith(`${packageBuildDirectory}/`) &&
      !path.includes('/node_modules/')
    );
  }

  /** Bundle like the hosted runtime: one classic script with its styles injected. */
  async function buildApp(): Promise<{
    bundle: Bundle;
    inputFiles: string[];
    directories: string[];
  }> {
    const inputFiles = new Set([appFile]);
    const directories = new Set([dirname(appFile)]);
    const pathMatchers = new Map<string, PathsMatcher | null>();

    function importCandidates(specifier: string, directory: string) {
      if (specifier.startsWith('.') || isAbsolute(specifier))
        return [resolve(directory, specifier)];
      let matchPaths = pathMatchers.get(directory);
      if (matchPaths === undefined) {
        const tsconfig = getTsconfig(directory);
        matchPaths = tsconfig ? createPathsMatcher(tsconfig) : null;
        pathMatchers.set(directory, matchPaths);
      }
      return matchPaths?.(specifier) ?? [];
    }
    function resolvePreviewDependency(specifier: string) {
      const name = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0]!;
      let directory = dirname(appFile);
      while (true) {
        if (existsSync(join(directory, 'node_modules', name, 'package.json')))
          return Bun.resolveSync(specifier, directory);
        const parent = dirname(directory);
        if (parent === directory) break;
        directory = parent;
      }
      // Resolve uninstalled files from the preview environment. Asking Bun to
      // resolve absent app dependencies can select incomplete global-cache copies.
      return Bun.resolveSync(specifier, import.meta.dir);
    }

    const previewDependencies: BunPlugin = {
      name: 'data-app-preview-dependencies',
      setup(build) {
        build.onResolve(
          {
            filter:
              /^(?:@altertable\/data-app(?:-react|-embed|-bun|-worker)?|react|react-dom)(?:\/.*)?$/,
          },
          args => ({ path: resolvePreviewDependency(args.path) })
        );
        build.onResolve({ filter: /.*/ }, ({ path, resolveDir, importer }) => {
          if (!importer || !isAppInput(importer)) return undefined;
          for (const candidate of importCandidates(path, resolveDir)) {
            if (!isAppInput(candidate)) continue;
            let directory =
              existsSync(candidate) && statSync(candidate).isDirectory()
                ? candidate
                : dirname(candidate);
            // Watch the nearest existing parent so creating missing imports triggers a retry.
            while (!existsSync(directory)) directory = dirname(directory);
            directories.add(directory);
          }
          return undefined;
        });
        // Observe inputs before parsing so errors still leave their files watchable.
        build.onLoad({ filter: /.*/ }, ({ path }) => {
          if (isAppInput(path)) {
            inputFiles.add(path);
            directories.add(dirname(path));
          }
          return undefined;
        });
      },
    };
    try {
      const result = await Bun.build({
        entrypoints: [appFile],
        target: 'browser',
        conditions: ['browser', 'import', 'module', 'default'],
        format: 'iife',
        define: { 'import.meta.env': '{}' },
        // The data document has an opaque origin, so the map cannot be fetched separately.
        sourcemap: 'inline',
        plugins: [previewDependencies],
      });
      const script = result.outputs.find(output => output.path.endsWith('.js'));
      if (!script) throw new Error('App build did not produce JavaScript.');
      const javascript = await script.text();
      const stylesheet = result.outputs.find(output =>
        output.path.endsWith('.css')
      );
      if (!stylesheet)
        return {
          bundle: { javascript },
          inputFiles: [...inputFiles],
          directories: [...directories],
        };
      const css = await stylesheet.text();
      // Append rather than prepend so source map line offsets stay aligned.
      return {
        inputFiles: [...inputFiles],
        directories: [...directories],
        bundle: {
          javascript: `${javascript}\n{ const style = document.createElement('style'); style.textContent = ${JSON.stringify(css)}; document.head.append(style); }`,
        },
      };
    } catch (error) {
      const errors: unknown[] =
        error instanceof AggregateError ? error.errors : [error];
      return {
        bundle: { error: errors.map(formatBuildError).join('\n\n') },
        inputFiles: [...inputFiles],
        directories: [...directories],
      };
    }
  }

  function formatBuildError(error: unknown) {
    const { message, position } = error as Partial<BuildMessage>;
    if (!message) return String(error);
    return position
      ? `${message}\n  at ${position.file}:${position.line}:${position.column}\n  ${position.lineText}`
      : message;
  }

  const initialBuild = await buildApp();
  let currentBundle = initialBuild.bundle;
  let watchedFiles = new Set(initialBuild.inputFiles);
  if ('error' in currentBundle) console.error(currentBundle.error);

  const reload = createReloadChannel();
  let rebuildQueue = Promise.resolve();
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleRebuild() {
    if (stopped) return;
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildQueue = rebuildQueue.then(async () => {
        const result = await buildApp();
        if (stopped) return;
        currentBundle = result.bundle;
        watchedFiles = new Set(result.inputFiles);
        if ('error' in currentBundle) console.error(currentBundle.error);
        else console.log(`Rebuilt ${appFile}`);
        updateWatchers(result.directories);
        reload.notify();
      });
    }, 50);
  }

  // Watch directories rather than files so editors that save by renaming still trigger rebuilds.
  const watchers = new Map<string, FSWatcher>();
  function updateWatchers(inputDirectories: string[]) {
    const directories = new Set(inputDirectories);
    // A failed build may stop before reaching dependencies from the last successful build.
    if ('error' in currentBundle)
      for (const directory of watchers.keys()) directories.add(directory);
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
  const statuses = {
    unauthorized: 401,
    forbidden: 403,
    rate_limited: 429,
    query_rejected: 400,
    unavailable: 502,
  } as const;

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port,
    idleTimeout: 60,
    async fetch(request, server) {
      const hosts = [`127.0.0.1:${server.port}`, `localhost:${server.port}`];
      if (!hosts.includes(request.headers.get('host') ?? ''))
        return new Response('Forbidden', { status: 403 });
      const path = new URL(request.url).pathname;
      if (path === '/' && request.method === 'GET')
        return new Response(DATA_APP_PREVIEW_HTML, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      if (path === '/bundle.js')
        return 'error' in currentBundle
          ? new Response(currentBundle.error, { status: 500 })
          : new Response(currentBundle.javascript, {
              headers: { 'content-type': 'text/javascript; charset=utf-8' },
            });
      if (path === '/reload') {
        server.timeout(request, 0);
        return reload.connect(request);
      }
      if (path === '/api/sql' && request.method === 'POST') {
        const origin = request.headers.get('origin');
        const site = request.headers.get('sec-fetch-site');
        if (
          !hosts.some(host => origin === `http://${host}`) ||
          (site !== null && site !== 'same-origin')
        )
          return new Response('Forbidden', { status: 403 });
        let query;
        try {
          const body = await readRequestBody(request, 100_000);
          query = sqlQueryRoute.input(JSON.parse(body));
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError)
            return Response.json({ reason: 'query_rejected' }, { status: 413 });
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
          if (error instanceof DataSourceError)
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

  let stopPromise: Promise<void> | undefined;
  function stop(): Promise<void> {
    return (stopPromise ??= (async () => {
      stopped = true;
      clearTimeout(rebuildTimer);
      for (const watcher of watchers.values()) watcher.close();
      watchers.clear();
      reload.close();
      await server.stop(true);
      await rebuildQueue;
    })());
  }
  try {
    updateWatchers(initialBuild.directories);
  } catch (error) {
    await stop();
    throw error;
  }
  return { url: server.url, stop };
}

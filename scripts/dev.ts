import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { GenericContainer, Wait } from 'testcontainers';
import { seedStatements } from '@/dev/seed';

const root = resolve(import.meta.dir, '..');
const mockApiPort = 15000;

async function seedMockApi(apiUrl: string) {
  for (const statement of seedStatements) {
    const response = await fetch(`${apiUrl}/query`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${btoa('dev:dev')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ statement }),
    });
    const body = await response.text();
    // The mock reports SQL errors as an NDJSON line in a successful response.
    if (!response.ok || body.includes('\n{"error":'))
      throw new Error(`Seeding failed for ${statement}: ${body}`);
  }
}

async function startMockApi() {
  try {
    const container = await new GenericContainer(
      'ghcr.io/altertable-ai/altertable-mock:latest'
    )
      .withEnvironment({ ALTERTABLE_MOCK_USERS: 'dev:dev' })
      .withExposedPorts(mockApiPort)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
    const apiUrl = `http://${container.getHost()}:${container.getMappedPort(mockApiPort)}`;
    await seedMockApi(apiUrl).catch(async error => {
      await container.stop();
      throw error;
    });
    return { container, apiUrl };
  } catch (error) {
    console.error(
      'Could not start the mocked Altertable API. Is Docker running?\n',
      error
    );
    process.exit(1);
  }
}

async function runBun(args: string[]) {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return (await child.exited) === 0;
}

// Declarations are only built once; editors keep them while JavaScript rebuilds.
const [initialBuildSucceeded, { container: mockApi, apiUrl: mockApiUrl }] =
  await Promise.all([runBun(['run', 'build']), startMockApi()]);
if (!initialBuildSucceeded) {
  await mockApi.stop();
  process.exit(1);
}

function startServer() {
  return Bun.spawn([process.execPath, 'dev/server.ts'], {
    cwd: root,
    env: {
      ...process.env,
      DATA_APP_DEV: '1',
      ALTERTABLE_API_BASE: mockApiUrl,
      ALTERTABLE_LAKEHOUSE_USERNAME: 'dev',
      ALTERTABLE_LAKEHOUSE_PASSWORD: 'dev',
    },
    stdout: 'inherit',
    stderr: 'inherit',
  });
}
let server = startServer();
let restartRequested = false;
let wakeForBuild: (() => void) | undefined;
let stopping = false;
let restartTimer: ReturnType<typeof setTimeout> | undefined;
const readyWatcher = watch(
  resolve(root, 'node_modules/.cache'),
  (_, filename) => {
    if (filename !== 'data-app-build-ready') return;
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      restartRequested = true;
      server.kill();
      wakeForBuild?.();
    }, 50);
  }
);
const port = Number(process.env.DATA_APP_TEST_PORT ?? 27418);
console.log(`Mocked Altertable API: ${mockApiUrl}`);
console.log(`Gallery: http://127.0.0.1:${port}/gallery`);
console.log(`Playground: http://127.0.0.1:${port}/playground`);
let isBuilding = false;
let rebuildQueued = false;
let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

async function rebuild() {
  if (isBuilding) {
    rebuildQueued = true;
    return;
  }
  isBuilding = true;
  const started = performance.now();
  const ok = await runBun(['run', 'scripts/build.ts', '--incremental']);
  console.log(
    ok
      ? `Rebuilt in ${Math.round(performance.now() - started)}ms`
      : 'Build failed; open pages keep the last successful build.'
  );
  isBuilding = false;
  if (rebuildQueued) {
    rebuildQueued = false;
    void rebuild();
  }
}

watch(resolve(root, 'src'), { recursive: true }, () => {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => void rebuild(), 50);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    stopping = true;
    readyWatcher.close();
    clearTimeout(restartTimer);
    server.kill();
    wakeForBuild?.();
    await mockApi.stop();
    process.exit(0);
  });
while (true) {
  await server.exited;
  if (stopping) break;
  if (!restartRequested) {
    console.error(
      'Preview server stopped; waiting for a successful package build.'
    );
    await new Promise<void>(resolve => {
      wakeForBuild = resolve;
    });
  }
  if (stopping) break;
  wakeForBuild = undefined;
  restartRequested = false;
  server = startServer();
}
readyWatcher.close();
if (!stopping) await mockApi.stop();

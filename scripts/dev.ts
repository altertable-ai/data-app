import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { GenericContainer, Wait } from 'testcontainers';

const root = resolve(import.meta.dir, '..');
const lakehousePort = 15000;

/** Demo tables queried by `dev/playground.tsx`. Orders land in its 30-day window;
 * Linus never orders, so FI stays a measured zero. */
const seedStatements = [
  'CREATE SCHEMA demo',
  'CREATE TABLE demo.customers (id INTEGER, name VARCHAR, country VARCHAR, created_at TIMESTAMP)',
  'CREATE TABLE demo.orders (id INTEGER, customer_id INTEGER, amount DECIMAL(10, 2), status VARCHAR, ordered_at TIMESTAMP)',
  'CREATE TABLE demo.events (id INTEGER, customer_id INTEGER, name VARCHAR, properties JSON, occurred_at TIMESTAMP)',
  `INSERT INTO demo.customers VALUES
    (1, 'Ada', 'FR', TIMESTAMP '2026-09-01 09:00:00'),
    (2, 'Grace', 'US', TIMESTAMP '2026-09-03 14:30:00'),
    (3, 'Linus', 'FI', TIMESTAMP '2026-09-12 11:15:00'),
    (4, 'Margaret', 'US', TIMESTAMP '2026-09-14 08:40:00'),
    (5, 'Alan', 'GB', TIMESTAMP '2026-09-18 17:05:00'),
    (6, 'Hedy', 'AT', TIMESTAMP '2026-09-21 10:20:00')`,
  `INSERT INTO demo.orders
    SELECT i,
      [1, 2, 4, 5, 6, 2, 4, 2, 1, 5, 4][(i * 7 + i // 13) % 11 + 1],
      CAST(15 + (i * i * 7 + i * 13) % 185 + (i % 100) / 100 AS DECIMAL(10, 2)),
      CASE WHEN i % 11 = 0 THEN 'refunded' WHEN i % 7 = 0 THEN 'pending' ELSE 'paid' END,
      CAST(current_date AS TIMESTAMP)
        - to_days(CAST(least(29, floor(30 * pow((i * 0.618034) % 1, 1.2))) AS INTEGER))
        + to_minutes(CAST((i * 53) % 1440 AS INTEGER))
    FROM range(1, 241) t(i)`,
  `INSERT INTO demo.events
    SELECT id, id, 'signed_up', json_object('country', country), created_at
    FROM demo.customers
    UNION ALL
    SELECT 100 + id, customer_id, 'checkout', json_object('order_id', id, 'amount', amount), ordered_at
    FROM demo.orders`,
];

async function seedMockApi(base: string) {
  for (const statement of seedStatements) {
    const response = await fetch(`${base}/query`, {
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
      .withExposedPorts(lakehousePort)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
    const base = `http://${container.getHost()}:${container.getMappedPort(lakehousePort)}`;
    await seedMockApi(base).catch(async error => {
      await container.stop();
      throw error;
    });
    return { container, base };
  } catch (error) {
    console.error(
      'Could not start the mocked Altertable API. Is Docker running?\n',
      error
    );
    process.exit(1);
  }
}

async function run(args: string[]) {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  return (await child.exited) === 0;
}

// Declarations are only built once; editors keep them while JavaScript rebuilds.
const [built, { container: mockApi, base: mockApiBase }] = await Promise.all([
  run(['run', 'build']),
  startMockApi(),
]);
if (!built) {
  await mockApi.stop();
  process.exit(1);
}

const server = Bun.spawn([process.execPath, 'browser-tests/server.ts'], {
  cwd: root,
  env: {
    ...process.env,
    DATA_APP_DEV: '1',
    ALTERTABLE_API_BASE: mockApiBase,
    ALTERTABLE_LAKEHOUSE_USERNAME: 'dev',
    ALTERTABLE_LAKEHOUSE_PASSWORD: 'dev',
  },
  stdout: 'inherit',
  stderr: 'inherit',
});
const port = Number(process.env.DATA_APP_TEST_PORT ?? 27418);
console.log(`Mocked Altertable API: ${mockApiBase}`);
console.log(`Gallery: http://127.0.0.1:${port}/gallery`);
console.log(`Playground: http://127.0.0.1:${port}/playground`);
let building = false;
let queued = false;
let pending: ReturnType<typeof setTimeout> | undefined;

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  const started = performance.now();
  const ok = await run(['run', 'scripts/build.ts', '--incremental']);
  console.log(
    ok
      ? `Rebuilt in ${Math.round(performance.now() - started)}ms`
      : 'Build failed; open pages keep the last successful build.'
  );
  building = false;
  if (queued) {
    queued = false;
    void rebuild();
  }
}

watch(resolve(root, 'src'), { recursive: true }, () => {
  clearTimeout(pending);
  pending = setTimeout(() => void rebuild(), 50);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    server.kill();
    await mockApi.stop();
    process.exit(0);
  });
await server.exited;
await mockApi.stop();

import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

import { createDataAppRepairSession } from '@altertable/data-app-embed';
import { appDiagnostics, createDataClient } from '@altertable/data-app/client';
import { type DataOperations } from '@altertable/data-app/contract';
import { validateDataApp } from '@altertable/data-app/validation';
import { describe, expect, test } from 'vitest';

function report(name = 'broken') {
  return {
    failures: [{ kind: 'render' as const, name, message: 'Invalid series' }],
    pending: 0,
    truncated: 0,
    coverage: ['Mounted widgets only'],
  };
}
function tick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
describe('shared repair sessions', () => {
  test('three automatic requests across revisions, healthy reports, reloads and restored viewers', async () => {
    const state = { automaticRequests: 0, attemptedRevisions: [] as string[] };
    const delivered: string[] = [];
    const options = {
      state,
      saveState: () => {},
      requestRepair: async (_: unknown, context: { revision: string }) => {
        delivered.push(context.revision);
      },
    };
    let session = createDataAppRepairSession(options);
    for (let i = 1; i <= 4; i++) {
      const lease = session.connect(`rev-${i}`);
      lease.report(report());
      await tick();
      lease.report({ ...report(), failures: [] });
      lease.dispose();
      session = createDataAppRepairSession(options);
      session.connect(`rev-${i}`).report(report());
      await tick();
    }
    expect(delivered).toEqual(['rev-1', 'rev-2', 'rev-3']);
    expect(state.automaticRequests).toBe(3);
    await session.request();
    await session.request();
    expect(delivered).toEqual(['rev-1', 'rev-2', 'rev-3', 'rev-4', 'rev-4']);
    expect(state.automaticRequests).toBe(3);
  });
  test('serializes repair requests and waits for the latest settled report', async () => {
    let release!: () => void;
    const state = { automaticRequests: 0, attemptedRevisions: [] as string[] };
    const sent: string[] = [];
    const session = createDataAppRepairSession({
      state,
      saveState: () =>
        new Promise<void>(resolve => {
          release = resolve;
        }),
      requestRepair: async report => {
        sent.push(report.failures.map(failure => failure.name).join(','));
      },
    });
    const stale = session.connect('old');
    const lease = session.connect('new');
    stale.report(report('stale'));
    expect(session.snapshot().report).toBeUndefined();
    lease.report({ ...report(), pending: 1 });
    expect(sent).toEqual([]);
    lease.report(report('first'));
    lease.report({ ...report('still running'), pending: 1 });
    await Promise.all([session.request(), lease.request(), session.request()]);
    release();
    await tick();
    expect(sent).toEqual([]);
    expect(state.automaticRequests).toBe(1);
    lease.report(report('latest'));
    await tick();
    expect(sent).toEqual(['latest']);
    expect(state.automaticRequests).toBe(1);
    expect(session.snapshot().status).toBe('accepted');
  });
  test.each(['save', 'delivery'])('failed %s cannot loop', async failure => {
    const state = { automaticRequests: 0, attemptedRevisions: [] as string[] };
    let attempts = 0;
    const session = createDataAppRepairSession({
      state,
      saveState: () => {
        if (failure === 'save') throw new Error();
      },
      requestRepair: async () => {
        attempts++;
        throw new Error();
      },
    });
    const lease = session.connect('one');
    lease.report(report());
    await tick();
    for (let i = 0; i < 5; i++) lease.report(report());
    await tick();
    expect(attempts).toBe(failure === 'save' ? 0 : 1);
    expect(session.snapshot().status).toBe('failed');
    expect(state.automaticRequests).toBe(1);
    await session.request();
    expect(attempts).toBe(failure === 'save' ? 1 : 2);
    expect(state.automaticRequests).toBe(1);
  });
  test.each(['saving', 'settling'])(
    'superseded session cannot deliver while %s',
    async phase => {
      let release!: () => void;
      let saves = 0;
      const delivered: string[] = [];
      const session = createDataAppRepairSession({
        state: { automaticRequests: 0, attemptedRevisions: [] },
        saveState: () => {
          if (++saves > 1) return;
          return new Promise<void>(resolve => {
            release = resolve;
          });
        },
        requestRepair: async (_, context) => {
          delivered.push(context.revision);
        },
      });
      const old = session.connect('old');
      old.report(report());
      if (phase === 'settling') {
        old.report({ ...report(), pending: 1 });
        release();
        await tick();
      }
      session.connect('replacement').report(report());
      if (phase === 'saving') release();
      old.report(report('stale'));
      await tick();
      expect(delivered).toEqual(['replacement']);
    }
  );
});

test('Node validation settles independent checks, bounds diagnostics and excludes input values', async () => {
  let healthy = false;
  const result = await validateDataApp({
    checks: [
      {
        name: 'bad query',
        kind: 'query',
        run: () => {
          throw new Error('Unknown column "private-value" token=secret-value');
        },
      },
      {
        name: 'healthy',
        kind: 'operation',
        run: () => {
          healthy = true;
        },
      },
      {
        name: 'bad widget',
        kind: 'render',
        run: () => {
          throw new Error('Missing series');
        },
      },
    ],
  });
  expect(healthy).toBe(true);
  expect(result.failures.map(failure => failure.kind)).toEqual([
    'query',
    'render',
  ]);
  expect(JSON.stringify(result)).not.toContain('private-value');
  expect(JSON.stringify(result)).not.toContain('secret-value');
  expect(result.coverage[0]).toContain('3 declared checks observed');
  const truncated = await validateDataApp({
    checks: Array.from({ length: 35 }, (_, index) => ({
      name: `${index}`,
      kind: 'render',
      run: () => {
        throw new Error('Invalid');
      },
    })),
  });
  expect(truncated.failures).toHaveLength(30);
  expect(truncated.truncated).toBe(5);
});

test('validation runs in a real Node process with Bun absent from PATH', () => {
  const node = realpathSync(
    spawnSync('which', ['node'], { encoding: 'utf8' }).stdout.trim()
  );
  const result = spawnSync(
    node,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { validateDataApp } from '@altertable/data-app/validation';
    assert.equal(globalThis.Bun, undefined);
    const headers = [
      'Authorization: Bearer synthetic-credential',
      'Authorization: Basic synthetic-credential==',
      'Authorization=Bearer synthetic-credential',
      'Proxy-Authorization: Bearer "synthetic-credential"',
      'Authorization: "Bearer synthetic-credential"',
      'X-Api-Key: synthetic-credential',
      'Api-Key=synthetic-credential',
      'Cookie: session=synthetic-credential; csrf=synthetic-credential',
      'Set-Cookie: session=synthetic-credential; Path=/'
    ];
    const report = await validateDataApp({ checks: [
      ...headers.map((header, index) => ({
        name: 'query-' + index, kind: 'query',
        source: { file: '/Users/example/private/app.tsx?token=synthetic-credential', line: 42, column: 7 },
        run() { throw new Error(header); }
      })),
      { name: 'operation', kind: 'operation', run() { throw new Error('Operation failed'); } }
    ] });
    assert.equal(report.failures.length, headers.length + 1);
    assert(!JSON.stringify(report).includes('synthetic-credential'));
    assert(!JSON.stringify(report).includes('/Users/example'));
    assert.deepEqual(report.failures[0].source, { file: 'app.tsx', line: 42, column: 7 });
    console.log('node-validation-ok');
  `,
    ],
    { env: { ...process.env, PATH: '/nonexistent' }, encoding: 'utf8' }
  );
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('node-validation-ok');
});

test('caller cancellation leaves no query diagnostics or automatic repair request', async () => {
  let started!: () => void;
  const ready = new Promise<void>(resolve => {
    started = resolve;
  });
  const controller = new AbortController();
  const sent: unknown[] = [];
  const session = createDataAppRepairSession({
    state: { automaticRequests: 0, attemptedRevisions: [] },
    saveState() {},
    requestRepair: async report => {
      sent.push(report);
    },
  });
  const lease = session.connect('cancelled');
  const unsubscribe = appDiagnostics.subscribe(() =>
    lease.report(appDiagnostics.snapshot())
  );
  try {
    const operations = {
      cancelled: {
        input: () => ({}),
        checks: [{}] as const,
        policy: { maxQueryRows: 10, maxDurationMs: 1000 },
        run: ({ lakehouse, signal }) =>
          lakehouse.queryAll('SELECT 1', {
            name: 'cancelled query',
            limit: 1,
            signal,
          }),
      },
    } satisfies DataOperations;
    const client = createDataClient({
      operations,
      lakehouse: {
        queryAll: (_statement, { signal }) =>
          new Promise<never>((_resolve, reject) => {
            started();
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            });
          }),
      },
    });
    const request = client.query(
      'cancelled',
      {},
      { signal: controller.signal }
    );
    await ready;
    controller.abort(new DOMException('User cancelled', 'AbortError'));
    await expect(request).rejects.toThrow('User cancelled');
    await tick();
    expect(appDiagnostics.snapshot().failures).toEqual([]);
    expect(appDiagnostics.snapshot().pending).toBe(0);
    expect(sent).toEqual([]);
  } finally {
    unsubscribe();
    lease.dispose();
  }
});

test('validation reports unfinished work when a check ignores cancellation', async () => {
  const report = await validateDataApp({
    timeoutMs: 10,
    checks: [
      { kind: 'query', name: 'hung', run: () => new Promise(() => {}) },
      {
        kind: 'render',
        name: 'bad render',
        run: () => {
          throw new Error('Bad series');
        },
      },
    ],
  });
  expect(report.pending).toBe(1);
  expect(report.failures).toHaveLength(2);
  expect(report.failures[0]!.message).toContain('unfinished');
});

test('manual report submission does not consume an automatic reservation', async () => {
  const state = { automaticRequests: 0, attemptedRevisions: [] as string[] };
  const sent: boolean[] = [];
  const session = createDataAppRepairSession({
    state,
    saveState() {},
    requestRepair: async (_, context) => {
      sent.push(context.automatic);
    },
  });
  const lease = session.connect('one');
  lease.report(report(), false);
  await lease.request();
  expect(sent).toEqual([false]);
  expect(state.automaticRequests).toBe(0);
});

test('same-label failure identities stay distinct and can be cleared independently', () => {
  appDiagnostics.record(
    'render',
    'Revenue',
    new Error('Bad series'),
    'widget-one'
  );
  appDiagnostics.record(
    'render',
    'Revenue',
    new Error('Bad axis'),
    'widget-two'
  );
  expect(
    appDiagnostics
      .snapshot()
      .failures.filter(failure => failure.name === 'Revenue')
  ).toHaveLength(2);
  appDiagnostics.clear('render', 'Revenue', 'widget-one');
  expect(
    appDiagnostics
      .snapshot()
      .failures.filter(failure => failure.name === 'Revenue')
  ).toHaveLength(1);
  appDiagnostics.clear('render', 'Revenue', 'widget-two');
});

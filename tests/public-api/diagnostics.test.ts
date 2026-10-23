import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

import { createDataAppRepairSession } from '@altertable/data-app-embed';
import { appDiagnostics } from '@altertable/data-app/client';
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
  test('serializes all buttons and delivers latest report after saving', async () => {
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
    lease.report(report('latest'));
    await Promise.all([session.request(), lease.request(), session.request()]);
    release();
    await tick();
    expect(sent).toEqual(['latest']);
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
  test('superseded session cannot deliver after delayed state saving', async () => {
    let release!: () => void;
    let delivered = 0;
    const session = createDataAppRepairSession({
      state: { automaticRequests: 0, attemptedRevisions: [] },
      saveState: () =>
        new Promise<void>(resolve => {
          release = resolve;
        }),
      requestRepair: async () => {
        delivered++;
      },
    });
    session.connect('old').report(report());
    session.connect('replacement');
    release();
    await tick();
    expect(delivered).toBe(0);
  });
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
    import { appDiagnostics } from '@altertable/data-app/client';
import { validateDataApp } from '@altertable/data-app/validation';
    assert.equal(globalThis.Bun, undefined);
    const report = await validateDataApp({ checks: [
      { name: 'one', kind: 'query', run() { throw new Error('Query failed'); } },
      { name: 'two', kind: 'operation', run() { throw new Error('Operation failed'); } }
    ] });
    assert.equal(report.failures.length, 2);
    console.log('node-validation-ok');
  `,
    ],
    { env: { ...process.env, PATH: '/nonexistent' }, encoding: 'utf8' }
  );
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('node-validation-ok');
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

test('same-label widget failures remain distinct and unmounted widgets leave the report', () => {
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

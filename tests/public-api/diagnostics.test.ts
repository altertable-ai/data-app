import { createDataAppRepairSession } from '@altertable/data-app-embed';
import { appDiagnostics, createDataClient } from '@altertable/data-app/client';
import { type DataOperations } from '@altertable/data-app/contract';
import { describe, expect, test } from 'vitest';

function report(name = 'broken') {
  return {
    failures: [{ kind: 'render' as const, name, message: 'Invalid series' }],
    pending: 0,
    truncated: 0,
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

test('repair reports redact credentials and sanitize source locations', () => {
  const session = createDataAppRepairSession({
    state: { automaticRequests: 0, attemptedRevisions: [] },
    saveState() {},
  });
  const headers = [
    'Authorization: Bearer synthetic-credential',
    'Authorization: Basic synthetic-credential==',
    'Authorization=Bearer synthetic-credential',
    'Proxy-Authorization: Bearer "synthetic-credential"',
    'Authorization: "Bearer synthetic-credential"',
    'X-Api-Key: synthetic-credential',
    'Api-Key=synthetic-credential',
    'Cookie: session=synthetic-credential; csrf=synthetic-credential',
    'Set-Cookie: session=synthetic-credential; Path=/',
  ];
  session.connect('one').report({
    ...report(),
    failures: headers.map((message, index) => ({
      kind: 'query',
      name: `query-${index}`,
      message,
      source: {
        file: '/Users/example/private/app.tsx?token=synthetic-credential',
        line: 42,
        column: 7,
      },
    })),
  });
  const sanitized = session.snapshot().report!;
  expect(sanitized.failures).toHaveLength(headers.length);
  expect(JSON.stringify(sanitized)).not.toContain('synthetic-credential');
  expect(JSON.stringify(sanitized)).not.toContain('/Users/example');
  expect(sanitized.failures[0]!.source).toEqual({
    file: 'app.tsx',
    line: 42,
    column: 7,
  });
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

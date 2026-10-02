import { expect, test } from 'bun:test';
import { createIframeTransport } from '@altertable/data-app/client';
import {
  attachDataAppBridge,
  type DataAppLogger,
} from '@altertable/data-app/embed';
import type { BridgeMessage } from '@/src/core/bridge';

function recordingLogger(calls: unknown[][]): DataAppLogger {
  return {
    log: (...args) => {
      calls.push(['log', ...args]);
    },
    info: (...args) => {
      calls.push(['info', ...args]);
    },
    warn: (...args) => {
      calls.push(['warn', ...args]);
    },
    error: (...args) => {
      calls.push(['error', ...args]);
    },
  };
}

function harness(logger?: DataAppLogger, mode: 'url' | 'bundle' = 'url') {
  const hostEvents = new EventTarget();
  const frameEvents = new EventTarget();
  const queue: (() => void)[] = [];
  const sent: BridgeMessage[] = [];
  const requests: unknown[] = [];
  function receive(
    data: BridgeMessage,
    origin = mode === 'bundle' ? 'null' : 'https://app.example',
    source: unknown = target
  ) {
    hostEvents.dispatchEvent(
      Object.assign(new Event('message'), { data, origin, source })
    );
  }
  const parent = {
    postMessage(value: BridgeMessage) {
      const message = structuredClone(value);
      sent.push(message);
      queue.push(() => receive(message));
    },
  };
  const target = {
    postMessage(value: BridgeMessage) {
      const data = structuredClone(value);
      queue.push(() =>
        frameEvents.dispatchEvent(
          Object.assign(new Event('message'), {
            data,
            origin: 'https://shell.example',
            source: parent,
          })
        )
      );
    },
  };
  const host = attachDataAppBridge({
    iframe: Object.assign(new EventTarget(), {
      contentWindow: target,
    }) as unknown as HTMLIFrameElement,
    connection:
      mode === 'bundle'
        ? { type: 'opaque', token: 'sandbox-token' }
        : { type: 'origin', origin: 'https://app.example' },
    window: Object.assign(hostEvents, {
      location: { search: '', hash: '' },
    }) as unknown as Window,
    logger,
    async onMessage(message) {
      requests.push(message);
      return null;
    },
  });
  const frame = createIframeTransport({
    parentOrigin: 'https://shell.example',
    mode,
    window: Object.assign(frameEvents, { parent }) as unknown as Window,
  });
  function flush() {
    while (queue.length) queue.shift()!();
  }
  function dispose() {
    frame.dispose();
    host.dispose();
  }
  return { host, frame, sent, requests, receive, flush, dispose };
}

test('iframe forwards log, info, warn and error to the shell without requests', () => {
  const calls: unknown[][] = [];
  const h = harness(recordingLogger(calls));
  try {
    expect(h.frame.logger).toBeUndefined();
    h.flush();
    calls.length = 0;
    const logger = h.frame.logger!;
    expect(Object.keys(logger).sort()).toEqual([
      'error',
      'info',
      'log',
      'warn',
    ]);
    logger.info(() => ['Completed', { rows: 3 }]);
    const details = { rows: 1 };
    logger.log('Snapshot', details);
    details.rows = 2;
    logger.warn('Slow', () => ({ duration: 120 }));
    logger.error(new Error('failed'));
    expect(calls).toEqual([]);
    h.flush();
    expect(calls).toEqual([
      ['info', 'Completed', { rows: 3 }],
      ['log', 'Snapshot', { rows: 1 }],
      ['warn', 'Slow', { duration: 120 }],
      ['error', expect.any(Error)],
    ]);
    expect(h.requests).toEqual([]);
    expect(
      h.sent
        .filter(message => message.type === 'runtime:log')
        .every(message => message.id === undefined)
    ).toBe(true);
  } finally {
    h.dispose();
  }
});

test('iframe logger exists only while the bridge supplies a logger', () => {
  const first: unknown[][] = [];
  const second: unknown[][] = [];
  const h = harness();
  let evaluated = 0;
  function lazy() {
    evaluated++;
    return 'entry';
  }
  try {
    expect(h.frame.logger).toBeUndefined();
    h.flush();
    expect(h.frame.logger).toBeUndefined();
    h.host.setLogger(recordingLogger(first));
    expect(h.frame.logger).toBeUndefined();
    h.flush();
    const retained = h.frame.logger!;
    expect(retained).toBeDefined();
    retained.info(lazy);
    h.flush();
    expect(first).toEqual([['info', 'entry']]);
    h.host.setLogger(recordingLogger(second));
    h.flush();
    h.frame.logger!.warn('replacement');
    h.flush();
    expect(second).toEqual([['warn', 'replacement']]);
    h.host.setLogger(undefined);
    h.flush();
    expect(h.frame.logger).toBeUndefined();
    retained.info(lazy);
    expect(evaluated).toBe(1);
    h.host.setLogger(recordingLogger(second));
    h.flush();
    expect(h.frame.logger).toBeDefined();
    h.frame.logger!.info('restored');
    h.flush();
    expect(second).toEqual([
      ['warn', 'replacement'],
      ['info', 'restored'],
    ]);
    h.frame.dispose();
    expect(h.frame.logger).toBeUndefined();
    retained.info(lazy);
    expect(evaluated).toBe(1);
  } finally {
    h.dispose();
  }
});

test('shell rejects foreign, stale and malformed log notifications', () => {
  const calls: unknown[][] = [];
  const h = harness(recordingLogger(calls));
  try {
    h.flush();
    calls.length = 0;
    h.sent.length = 0;
    h.frame.logger!.info('valid');
    h.flush();
    const message = h.sent.find(message => message.type === 'runtime:log')!;
    h.receive(message, 'https://foreign.example');
    h.receive(message, 'https://app.example', {});
    h.receive({ ...message, sessionId: 'stale' });
    h.receive({ ...message, documentId: 'stale' });
    h.receive({
      ...message,
      payload: { scopes: [], method: 'constructor', args: [] },
    });
    h.receive({
      ...message,
      payload: { scopes: [], method: 'warnDev', args: [42] },
    });
    h.receive({
      ...message,
      payload: { scopes: [], method: 'group', label: 'bad', entries: [null] },
    });
    expect(calls).toEqual([['info', 'valid']]);
  } finally {
    h.dispose();
  }
});

test('lazy argument, serialization and host logger failures stay isolated', () => {
  const calls: unknown[][] = [];
  const sink = recordingLogger(calls);
  sink.warn = () => {
    throw new Error('sink failure');
  };
  const h = harness(sink);
  try {
    h.flush();
    calls.length = 0;
    expect(() =>
      h.frame.logger!.info(() => {
        throw new Error('lazy failure');
      })
    ).not.toThrow();
    expect(() => h.frame.logger!.info({ callback() {} })).not.toThrow();
    h.frame.logger!.warn('sink failure');
    h.frame.logger!.info('still works');
    expect(() => h.flush()).not.toThrow();
    expect(calls).toEqual([['info', 'still works']]);
  } finally {
    h.dispose();
  }
});

for (const mode of ['url', 'bundle'] as const) {
  test(`${mode} iframe logs queued queries, SQL requests and cancellations without logging its own notifications`, async () => {
    const calls: unknown[][] = [];
    const h = harness(recordingLogger(calls), mode);
    const controller = new AbortController();
    try {
      const query = h.frame.request({
        route: 'data:query',
        payload: { operation: 'sales', input: { secret: 'private' } },
      });
      expect(calls).toEqual([]);
      h.flush();
      await Promise.resolve();
      h.flush();
      expect(await query).toBeNull();
      const sql = h.frame
        .request(
          {
            route: 'data:sql',
            payload: { statement: 'SELECT private FROM sales', limit: 10 },
          },
          controller.signal
        )
        .catch(error => error);
      controller.abort();
      h.flush();
      expect(await sql).toBe(controller.signal.reason);
      const sent = h.sent.filter(message =>
        ['bridge:request', 'bridge:cancel'].includes(message.type)
      );
      expect(
        calls.filter(call =>
          (call[2] as { type: string }).type.startsWith('bridge:')
        )
      ).toEqual([
        [
          'log',
          'Sending message to parent',
          {
            type: 'bridge:request',
            id: sent[0]!.id,
            route: 'data:query',
            operation: 'sales',
          },
        ],
        [
          'log',
          'Sending message to parent',
          {
            type: 'bridge:request',
            id: sent[1]!.id,
            route: 'data:sql',
          },
        ],
        [
          'log',
          'Sending message to parent',
          { type: 'bridge:cancel', id: sent[1]!.id },
        ],
      ]);
      h.frame.ready();
      h.frame.fail();
      h.flush();
      expect(calls.slice(-2)).toEqual([
        ['log', 'Sending message to parent', { type: 'runtime:ready' }],
        ['log', 'Sending message to parent', { type: 'runtime:error' }],
      ]);
      expect(
        calls.every(
          call => (call[2] as { type: string }).type !== 'runtime:log'
        )
      ).toBe(true);
      expect(JSON.stringify(calls)).not.toContain('private');
      expect(JSON.stringify(calls)).not.toContain('sandbox-token');
      expect(
        h.sent.filter(message => message.type === 'runtime:log')
      ).toHaveLength(calls.length);
      h.host.setLogger(undefined);
      h.flush();
      const count = calls.length;
      h.frame.ready();
      h.flush();
      expect(calls).toHaveLength(count);
      expect(
        h.sent.filter(message => message.type === 'runtime:log')
      ).toHaveLength(count);
    } finally {
      h.dispose();
    }
  });
}

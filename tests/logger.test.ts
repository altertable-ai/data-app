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

function harness(logger?: DataAppLogger) {
  const hostEvents = new EventTarget();
  const frameEvents = new EventTarget();
  const queue: (() => void)[] = [];
  const sent: BridgeMessage[] = [];
  const requests: unknown[] = [];
  function receive(
    data: BridgeMessage,
    origin = 'https://app.example',
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
    connection: { type: 'origin', origin: 'https://app.example' },
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
    h.flush();
    const logger = h.frame.logger;
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

test('logging is enabled by trusted host state and follows logger replacement, removal and disposal', () => {
  const first: unknown[][] = [];
  const second: unknown[][] = [];
  const h = harness();
  let evaluated = 0;
  function lazy() {
    evaluated++;
    return 'entry';
  }
  try {
    h.frame.logger.info(lazy);
    h.flush();
    h.frame.logger.info(lazy);
    expect(evaluated).toBe(0);
    h.host.setLogger(recordingLogger(first));
    h.flush();
    h.frame.logger.info(lazy);
    h.flush();
    expect(first).toEqual([['info', 'entry']]);
    h.host.setLogger(recordingLogger(second));
    h.flush();
    h.frame.logger.warn('replacement');
    h.flush();
    expect(second).toEqual([['warn', 'replacement']]);
    h.host.setLogger(undefined);
    h.flush();
    h.frame.logger.info(lazy);
    expect(evaluated).toBe(1);
    h.host.setLogger(recordingLogger(second));
    h.flush();
    h.frame.dispose();
    h.frame.logger.info(lazy);
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
    h.frame.logger.info('valid');
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
    expect(() =>
      h.frame.logger.info(() => {
        throw new Error('lazy failure');
      })
    ).not.toThrow();
    expect(() => h.frame.logger.info({ callback() {} })).not.toThrow();
    h.frame.logger.warn('sink failure');
    h.frame.logger.info('still works');
    expect(() => h.flush()).not.toThrow();
    expect(calls).toEqual([['info', 'still works']]);
  } finally {
    h.dispose();
  }
});

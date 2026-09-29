import { expect, test } from 'bun:test';
import { parseCount } from '@/src/core/contract';
import { createIframeTransport } from '@/src/client/iframe';
import {
  createMessageRouter,
  dataAppRoutes,
  defineMessageRoute,
} from '@/src/core/messages';
import { attachDataAppBridge } from '@/src/embed/host';
import {
  BRIDGE,
  MAX_PENDING,
  type BridgeMessage,
  type TransportResponse,
} from '@/src/core/bridge';

function harness() {
  const events = new EventTarget();
  const parent = {
    postMessage(message: BridgeMessage, origin: string) {
      sent.push({ message, origin });
    },
  };
  const sent: { message: BridgeMessage; origin: string }[] = [];
  const frame = Object.assign(events, { parent }) as unknown as Window;
  const bridge = createIframeTransport({
    parentOrigin: 'http://localhost:1',
    window: frame,
    timeoutMs: 50,
  });
  const documentId = sent[0]!.message.documentId;

  function receive(
    message: Partial<BridgeMessage>,
    origin = 'http://localhost:1',
    source = parent
  ) {
    events.dispatchEvent(
      Object.assign(new Event('message'), {
        origin,
        source: source as unknown as Window,
        data: {
          channel: BRIDGE,
          version: 1,
          documentId,
          sessionId: 'session',
          ...message,
        },
      })
    );
  }

  return { bridge, receive, sent, parent, frame };
}

test('iframe waits for a trusted handshake, correlates concurrent responses and preserves envelopes', async () => {
  const { bridge, receive, sent } = harness();
  try {
    const first = bridge.transport('first', { n: 1 });
    const second = bridge.transport('second', { n: 2 });
    receive({ type: 'initialize' }, 'http://evil.example');
    receive({ type: 'initialize' }, 'http://localhost:1', { postMessage() {} });
    expect(
      sent.filter(({ message }) => message.type === 'request')
    ).toHaveLength(0);
    receive({ type: 'initialize' });
    const queries = sent.filter(({ message }) => message.type === 'request');
    expect(queries).toHaveLength(2);
    expect(queries.every(({ origin }) => origin === 'http://localhost:1')).toBe(
      true
    );
    const response = {
      status: 200,
      body: {
        data: 2,
        requestId: 'server-request',
        queriedAt: '2026-09-30T00:00:00Z',
        queryIds: ['q2'],
      },
    };
    receive({ type: 'result', id: queries[1]!.message.id, response });
    expect(await second).toEqual(response);
    receive({
      type: 'result',
      id: queries[0]!.message.id,
      sessionId: 'stale',
      response,
    });
    receive({
      type: 'error',
      id: queries[0]!.message.id,
      code: 'forbidden',
      message: 'Denied',
    });
    expect(await first.catch(error => error)).toMatchObject({
      code: 'forbidden',
      message: 'Denied',
    });
  } finally {
    bridge.dispose();
  }
});

test('iframe aborts before and after dispatch and times out missing shells', async () => {
  const { bridge, receive, sent } = harness();
  try {
    const controller = new AbortController();
    const first = bridge.transport('first', {}, controller.signal);
    controller.abort();
    expect(await first.catch(error => error)).toMatchObject({
      name: 'AbortError',
    });
    receive({ type: 'initialize' });
    expect(sent.some(({ message }) => message.type === 'request')).toBe(false);
    const active = new AbortController();
    const second = bridge.transport('second', {}, active.signal);
    active.abort();
    expect(await second.catch(error => error)).toMatchObject({
      name: 'AbortError',
    });
    expect(sent.at(-1)!.message.type).toBe('cancel');
  } finally {
    bridge.dispose();
  }
  const missing = harness();
  try {
    expect(
      await missing.bridge.transport('connection', {}).catch(error => error)
    ).toMatchObject({
      code: 'bridge_unavailable',
    });
  } finally {
    missing.bridge.dispose();
  }
});

test('iframe bounds pending work and rejects old work on session replacement', async () => {
  const { bridge, receive } = harness();
  try {
    receive({ type: 'initialize' });
    const calls = Array.from({ length: MAX_PENDING }, () =>
      bridge.transport('connection', {}).catch(error => error.code)
    );
    expect(
      await bridge.transport('overflow', {}).catch(error => error)
    ).toMatchObject({
      code: 'bridge_busy',
    });
    receive({ type: 'initialize', sessionId: 'replacement' });
    expect(await Promise.all(calls)).toEqual(
      Array(MAX_PENDING).fill('bridge_reset')
    );
  } finally {
    bridge.dispose();
  }
});

test('shell rejects foreign sources, invalid input, duplicate IDs and stale sessions; reload cancels handler work', async () => {
  const events = new EventTarget();
  const sent: BridgeMessage[] = [];
  const target = {
    postMessage(message: BridgeMessage) {
      sent.push(message);
    },
  };
  const calls: {
    operation: string;
    input: unknown;
    signal: AbortSignal;
    resolve: (value: TransportResponse) => void;
    reject: (error: unknown) => void;
  }[] = [];
  const host = Object.assign(events, {
    location: { search: '', hash: '' },
  }) as unknown as Window;
  const dispose = attachDataAppBridge({
    iframe: Object.assign(new EventTarget(), {
      contentWindow: target,
    }) as unknown as HTMLIFrameElement,
    connection: { type: 'origin', origin: 'http://localhost:2' },
    window: host,
    onMessage: createMessageRouter(
      {
        ...dataAppRoutes,
        'test.ping': defineMessageRoute({
          input(value: unknown): undefined {
            if (value !== undefined)
              throw new Error('Unexpected ping payload.');

            return undefined;
          },
          output: parseCount,
        }),
      },
      {
        'data.query'({ operation, input }, { signal }) {
          return new Promise<TransportResponse>((resolve, reject) =>
            calls.push({ operation, input, signal, resolve, reject })
          );
        },
        'navigation.update'() {
          return null;
        },
        'test.ping'() {
          return 7;
        },
      }
    ).dispatch,
  });
  let sessionId: string | undefined;

  function receive(
    message: Partial<BridgeMessage>,
    origin = 'http://localhost:2',
    source = target
  ) {
    events.dispatchEvent(
      Object.assign(new Event('message'), {
        origin,
        source: source as unknown as Window,
        data: {
          channel: BRIDGE,
          version: 1,
          documentId: 'document',
          sessionId,
          ...message,
        },
      })
    );
  }

  try {
    receive({ type: 'ready' }, 'http://evil.example');
    receive({ type: 'ready' }, 'http://localhost:2', { postMessage() {} });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.type).toBe('connect');
    receive({ type: 'ready' });
    sessionId = sent.at(-1)!.sessionId;
    receive({
      type: 'request',
      id: 'ping',
      route: 'test.ping',
      payload: undefined,
    });
    await Bun.sleep(0);
    expect(sent.at(-1)).toMatchObject({
      type: 'result',
      id: 'ping',
      response: 7,
    });
    receive({
      type: 'request',
      id: 'invalid',
      route: 'data.query',
      payload: { operation: 'https://evil.example', input: {} },
    });
    receive({
      type: 'request',
      id: 'big',
      route: 'data.query',
      payload: { operation: 'connection', input: 'x'.repeat(16_384) },
    });
    receive({
      type: 'request',
      id: 'stale',
      route: 'data.query',
      payload: { operation: 'connection', input: {} },
      sessionId: 'old',
    });
    expect(calls).toHaveLength(0);
    receive({
      type: 'request',
      id: 'call',
      route: 'data.query',
      payload: { operation: 'connection', input: {} },
    });
    receive({
      type: 'request',
      id: 'call',
      route: 'data.query',
      payload: { operation: 'connection', input: {} },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.operation).toBe('connection');
    expect(calls[0]!.input).toEqual({});
    const response = {
      status: 403,
      body: { error: { code: 'forbidden', message: 'Denied' } },
    };
    calls[0]!.resolve(response);
    await Bun.sleep(0);
    expect(sent.at(-1)).toMatchObject({
      type: 'error',
      id: 'call',
      code: 'forbidden',
      message: 'Denied',
    });
    receive({
      type: 'request',
      id: 'failed',
      route: 'data.query',
      payload: { operation: 'connection', input: {} },
    });
    calls[1]!.reject(new Error('Private handler details'));
    await Bun.sleep(0);
    expect(sent.at(-1)).toMatchObject({
      type: 'error',
      id: 'failed',
      code: 'request_failed',
      message: 'The message request failed. Retry the request.',
    });
    receive({
      type: 'request',
      id: 'invalid-response',
      route: 'data.query',
      payload: { operation: 'connection', input: {} },
    });
    calls[2]!.resolve({ status: 0, body: {} });
    await Bun.sleep(0);
    expect(sent.at(-1)).toMatchObject({
      type: 'error',
      id: 'invalid-response',
      code: 'invalid_response',
    });
    receive({
      type: 'request',
      id: 'reload',
      route: 'data.query',
      payload: { operation: 'connection', input: {} },
    });
    receive({ type: 'ready', documentId: 'next-document' });
    expect(calls[3]!.signal.aborted).toBe(true);
    calls[3]!.resolve({ status: 200, body: { data: 'late' } });
    await Bun.sleep(0);
    expect(
      sent.some(message => message.type === 'result' && message.id === 'reload')
    ).toBe(false);
  } finally {
    dispose();
  }
});

test('opaque bridge requires source, null origin and token; reload aborts old work and rotates its token', async () => {
  const events = new EventTarget();
  const sent: BridgeMessage[] = [];
  const target = {
    postMessage(message: BridgeMessage, origin: string) {
      expect(origin).toBe('*');
      sent.push(message);
    },
  };
  const iframe = Object.assign(new EventTarget(), {
    contentWindow: target,
  }) as unknown as HTMLIFrameElement;
  const host = Object.assign(events, {
    location: { search: '?period=last-30', hash: '#totals' },
  }) as unknown as Window;
  let signal: AbortSignal | undefined;
  let finish: ((result: unknown) => void) | undefined;
  const statuses: string[] = [];
  const dispose = attachDataAppBridge({
    iframe,
    connection: { type: 'opaque', token: 'initial-token' },
    window: host,
    onStatusChange(status) {
      return statuses.push(status);
    },
    onMessage(_, context) {
      signal = context.signal;

      return new Promise(resolve => {
        finish = resolve;
      });
    },
  });

  function receive(
    message: Partial<BridgeMessage>,
    origin = 'null',
    source: unknown = target
  ) {
    return events.dispatchEvent(
      Object.assign(new Event('message'), {
        origin,
        source,
        data: {
          channel: BRIDGE,
          version: 1,
          documentId: 'document',
          token: 'initial-token',
          ...message,
        },
      })
    );
  }

  try {
    receive({ type: 'ready', token: 'wrong' });
    receive({ type: 'ready' }, 'http://localhost:2');
    receive({ type: 'ready' }, 'null', {});
    expect(sent).toHaveLength(1);
    receive({ type: 'ready' });
    const sessionId = sent.at(-1)!.sessionId;
    receive({
      type: 'request',
      sessionId,
      id: 'pending',
      route: 'test.echo',
      payload: {},
    });
    expect(signal?.aborted).toBe(false);
    iframe.dispatchEvent(new Event('load'));
    expect(signal?.aborted).toBe(true);
    const token = sent.at(-1)!.token;
    expect(token).not.toBe('initial-token');
    receive({ type: 'ready' });
    expect(sent.at(-1)!.type).toBe('connect');
    receive({ type: 'ready', token });
    expect(sent.at(-1)!.type).toBe('initialize');
    expect(sent.at(-1)!.search).toBe('?period=last-30');
    finish?.('old result');
    await Promise.resolve();
    expect(sent.some(message => message.type === 'result')).toBe(false);
    expect(statuses).toContain('connected');
  } finally {
    dispose();
  }
});

test('bundle transport keeps host location in memory and rejects stale session tokens', async () => {
  const events = new EventTarget();
  const sent: BridgeMessage[] = [];
  const parent = {
    postMessage(message: BridgeMessage) {
      sent.push(message);
    },
  };
  const frame = Object.assign(events, {
    parent,
    document: { title: 'Bundle' },
  }) as unknown as Window;
  let executions = 0;
  const bridge = createIframeTransport({
    parentOrigin: 'http://localhost:1',
    window: frame,
    mode: 'bundle',
    loadScript() {
      executions++;
    },
    timeoutMs: 100,
  });

  function receive(message: Partial<BridgeMessage>) {
    return events.dispatchEvent(
      Object.assign(new Event('message'), {
        origin: 'http://localhost:1',
        source: parent,
        data: {
          channel: BRIDGE,
          version: 1,
          documentId: sent.at(-1)?.documentId ?? 'host',
          sessionId: 'session',
          token: 'token',
          ...message,
        },
      })
    );
  }

  try {
    expect(sent).toHaveLength(0);
    receive({ type: 'connect', documentId: 'host' });
    const documentId = sent.at(-1)!.documentId;
    receive({
      type: 'initialize',
      documentId,
      search: '?period=last-30',
      hash: '#totals',
    });
    expect(bridge.appLocation.snapshot()).toEqual({
      search: '?period=last-30',
      hash: '#totals',
    });
    receive({
      type: 'script.load',
      documentId,
      token: 'stale',
      javascript: 'code',
    });
    expect(executions).toBe(0);
    receive({ type: 'script.load', documentId, javascript: 'code' });
    expect(executions).toBe(1);
    bridge.appLocation.update(
      { search: '?period=last-7', hash: '#daily' },
      'push'
    );
    const request = sent.at(-1)!;
    expect(request.route).toBe('navigation.update');
    expect(request.payload).toEqual({
      search: '?period=last-7',
      hash: '#daily',
      mode: 'push',
      title: 'Bundle',
    });
    receive({ type: 'result', documentId, id: request.id, response: null });
    receive({
      type: 'navigate',
      documentId,
      search: '?period=last-30',
      hash: '#totals',
    });
    expect(bridge.appLocation.snapshot().search).toBe('?period=last-30');
  } finally {
    bridge.dispose();
  }
});

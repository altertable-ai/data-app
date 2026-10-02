import { expect, test } from 'bun:test';
import fixtures from '@/tests/fixtures/bridge-v1.json';
import {
  BRIDGE,
  bridgeProtocol,
  parseBridgeMessage,
  type BridgeMessage,
  type BridgeEventName,
  type BridgeHandlers,
  type BridgeRole,
} from '@/src/core/bridge';
import { createBridgeEndpoint } from '@/src/core/bridge-endpoint';

function harness(
  role: BridgeRole = 'host',
  opaque = true,
  diagnostic?: (
    direction: 'send' | 'receive',
    type: BridgeMessage['type']
  ) => void
) {
  const source = {} as Window;
  const received: unknown[] = [];
  const sent: unknown[] = [];
  const invalid: string[] = [];
  const context: { documentId?: string; sessionId?: string; token?: string } = {
    documentId: 'document',
    sessionId: 'session',
    token: 'token',
  };
  const handlers = Object.fromEntries(
    Object.entries(bridgeProtocol.events)
      .filter(([, event]) => event.from !== role)
      .map(([name]) => [name, (message: unknown) => received.push(message)])
  ) as unknown as BridgeHandlers<BridgeRole>;
  const endpoint = createBridgeEndpoint({
    role,
    handlers,
    origin: 'https://peer.example',
    source: () => source,
    opaque,
    context: () => context,
    post: message => sent.push(message),
    invalidRequest: id => invalid.push(id),
    diagnostic,
  });
  function receive(
    fields: Record<string, unknown>,
    origin = 'https://peer.example',
    peer = source
  ) {
    endpoint.receive({
      data: {
        channel: BRIDGE,
        version: 1,
        documentId: 'document',
        sessionId: 'session',
        token: 'token',
        ...fields,
      },
      origin,
      source: peer,
    } as MessageEvent);
  }
  return {
    endpoint,
    receive,
    received,
    sent,
    invalid,
    context,
    source,
    receiveWire(message: unknown) {
      endpoint.receive({
        data: structuredClone(message),
        origin: 'https://peer.example',
        source,
      } as MessageEvent);
    },
  };
}

test('version 1 fixtures lock every event wire shape for producers and consumers', () => {
  expect(fixtures.map(fixture => fixture.name).sort()).toEqual(
    Object.keys(bridgeProtocol.events).sort()
  );
  for (const fixture of fixtures) {
    const from = fixture.from as BridgeRole;
    const producer = harness(from);
    if (fixture.name === 'connect' || fixture.name === 'ready')
      producer.context.sessionId = undefined;
    const {
      channel: _channel,
      version: _version,
      type: _type,
      documentId: _documentId,
      sessionId: _sessionId,
      token: _token,
      ...payload
    } = fixture.message;
    producer.endpoint.send(fixture.name as BridgeEventName, payload as never);
    expect(structuredClone(producer.sent[0])).toEqual(fixture.message);
    const consumer = harness(from === 'host' ? 'app' : 'host');
    consumer.receiveWire(fixture.message);
    expect(structuredClone(consumer.received[0])).toEqual(fixture.message);
  }
});

test('parsers reject malformed event fields and project future optional fields', () => {
  for (const fixture of fixtures) {
    expect(parseBridgeMessage({ ...fixture.message, future: true })).toEqual(
      parseBridgeMessage(fixture.message)
    );
    expect(
      parseBridgeMessage({ ...fixture.message, version: 2 })
    ).toBeUndefined();
  }
  const envelope = {
    channel: BRIDGE,
    version: 1,
    documentId: 'document',
    sessionId: 'session',
  };
  for (const fields of [
    { type: 'bridge:request', id: 'request', route: '' },
    { type: 'bridge:request', id: 'request', route: 'x'.repeat(257) },
    { type: 'bridge:cancel', id: 3 },
    { type: 'bridge:cancel', id: 'bad id' },
    { type: 'bridge:result', id: 'request' },
    { type: 'bridge:error', id: 'request', code: 3, message: 'bad' },
    {
      type: 'bridge:error',
      id: 'request',
      code: 'bad',
      message: 'bad',
      requestId: 3,
    },
    { type: 'script:load', javascript: 3 },
    { type: 'future:event' },
  ])
    expect(parseBridgeMessage({ ...envelope, ...fields })).toBeUndefined();
  expect(
    parseBridgeMessage({
      ...envelope,
      type: 'bridge:result',
      id: 'request',
      response: undefined,
    })
  ).toBeDefined();
});

test('endpoints reject unknown, wrong-direction and stale events before dispatch', () => {
  const host = harness();
  const message = {
    type: 'bridge:request',
    id: 'request',
    route: 'test:ping',
    payload: null,
  };
  host.receive({ ...message, type: 'future:event' });
  host.receive({ type: 'bridge:result', id: 'request', response: 3 });
  host.receive({ ...message, sessionId: 'stale' });
  host.receive({ ...message, documentId: 'stale' });
  host.receive({ ...message, token: 'stale' });
  host.receive(message, 'https://evil.example');
  host.receive(message, 'https://peer.example', {} as Window);
  expect(host.received).toHaveLength(0);
  host.receive({ ...message, future: true });
  expect(host.received).toHaveLength(1);
  expect(host.received[0]).not.toHaveProperty('future');
});

test('only authenticated current-session malformed requests expose a correlated error', () => {
  const host = harness();
  const malformed = { type: 'bridge:request', id: 'request', route: 3 };
  host.receive({ ...malformed, sessionId: 'stale' });
  host.receive({ ...malformed, token: 'stale' });
  host.receive({ ...malformed, documentId: 'stale' });
  host.receive(malformed, 'https://evil.example');
  host.receive({ ...malformed, id: 'invalid id' });
  expect(host.invalid).toHaveLength(0);
  host.receive(malformed);
  expect(host.invalid).toEqual(['request']);
  expect(host.received).toHaveLength(0);
});

test('handshake events work before a session and ordinary events wait for initialization', () => {
  const app = harness('app');
  app.context.sessionId = undefined;
  app.context.token = undefined;
  app.receive({
    type: 'bridge:connect',
    documentId: 'host',
    token: 'new-token',
  });
  expect(app.received).toHaveLength(1);
  app.receive({ type: 'bridge:initialize', token: 'new-token', state: null });
  expect(app.received).toHaveLength(1);
  app.context.token = 'new-token';
  app.receive({ type: 'bridge:initialize', token: 'new-token', state: null });
  expect(app.received).toHaveLength(2);
  app.receive({ type: 'state:update', token: 'new-token', state: null });
  expect(app.received).toHaveLength(2);
  expect(() => app.endpoint.send('runtimeReady', {})).toThrow();
  app.context.sessionId = 'session';
  app.receive({ type: 'state:update', token: 'new-token', state: null });
  expect(app.received).toHaveLength(3);
  app.endpoint.dispose();
  app.receive({ type: 'state:update', token: 'new-token', state: null });
  expect(app.received).toHaveLength(3);
  expect(() => app.endpoint.send('runtimeReady', {})).toThrow();
});

test('diagnostic disposal stops posting while subsequent sends remain strict', () => {
  const host = harness('host', true, direction => {
    if (direction === 'send') host.endpoint.dispose();
  });
  expect(() =>
    host.endpoint.send('result', { id: 'request', response: undefined })
  ).not.toThrow();
  expect(host.sent).toHaveLength(0);
  expect(() =>
    host.endpoint.send('result', { id: 'request', response: 3 })
  ).toThrow('closed');
});

test('diagnostic disposal stops receive dispatch', () => {
  const host = harness('host', true, direction => {
    if (direction === 'receive') host.endpoint.dispose();
  });
  host.receive({
    type: 'bridge:request',
    id: 'request',
    route: 'test:ping',
    payload: undefined,
  });
  expect(host.received).toHaveLength(0);
});

test('structured clone preserves undefined request payloads and result fields', () => {
  for (const opaque of [false, true]) {
    const app = harness('app', opaque);
    const host = harness('host', opaque);
    app.endpoint.send('request', {
      id: 'request',
      route: 'test:ping',
      payload: undefined,
    });
    const request = structuredClone(app.sent[0]) as Record<string, unknown>;
    expect(Object.hasOwn(request, 'payload')).toBe(true);
    expect(request.payload).toBeUndefined();
    expect(Object.hasOwn(request, 'token')).toBe(opaque);
    host.receiveWire(request);
    expect(structuredClone(host.received[0])).toEqual(request);
    host.endpoint.send('result', { id: 'request', response: undefined });
    const result = structuredClone(host.sent[0]) as Record<string, unknown>;
    expect(Object.hasOwn(result, 'response')).toBe(true);
    expect(result.response).toBeUndefined();
    app.receiveWire(result);
    expect(structuredClone(app.received[0])).toEqual(result);
    delete result.response;
    app.receiveWire(result);
    expect(app.received).toHaveLength(1);
  }
});

test('structured clone preserves absent optional envelope fields before the handshake', () => {
  const app = harness('app', false);
  app.context.sessionId = undefined;
  app.endpoint.send('ready', {});
  const ready = structuredClone(app.sent[0]) as Record<string, unknown>;
  expect(Object.hasOwn(ready, 'sessionId')).toBe(false);
  expect(Object.hasOwn(ready, 'token')).toBe(false);
  const host = harness('host', false);
  host.receiveWire(ready);
  expect(structuredClone(host.received[0])).toEqual(ready);
});

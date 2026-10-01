import { expect, test } from 'bun:test';
import { BRIDGE, type BridgeMessage } from '@/src/core/bridge';
import {
  createIframeTransport,
  installDataAppTransport,
  createDataAppNavigation,
  getDataAppNavigation,
} from '@altertable/data-app/client';

function harness(mode: 'url' | 'bundle' = 'bundle') {
  const sent: BridgeMessage[] = [];
  const parent = {
    postMessage(message: BridgeMessage) {
      sent.push(message);
    },
  };
  let href =
    'https://app.example/?__altertable_parent=https%3A%2F%2Fhost.example';
  const writes: string[] = [];
  const frame = Object.assign(new EventTarget(), {
    parent,
    document: { title: 'Navigation fixture' },
    location: {
      get href() {
        return href;
      },
    },
    history: {
      replaceState(_data: unknown, _unused: string, url: URL) {
        href = url.href;
        writes.push(href);
      },
    },
  }) as unknown as Window;
  const bridge = createIframeTransport({
    parentOrigin: 'https://host.example',
    mode,
    window: frame,
  });
  let documentId = '';

  function receive(
    message: Partial<BridgeMessage>,
    origin = 'https://host.example',
    source: unknown = parent
  ) {
    frame.dispatchEvent(
      Object.assign(new Event('message'), {
        origin,
        source,
        data: {
          channel: BRIDGE,
          version: 1,
          documentId,
          sessionId: 'session',
          token: 'token',
          ...message,
        },
      })
    );
  }

  receive({ type: 'bridge:connect', documentId: 'host' });
  documentId = sent.at(-1)!.documentId;

  return { bridge, frame, receive, sent, writes };
}

test('transport retains opaque host state without applying navigation', () => {
  const { bridge, frame, receive, writes, sent } = harness('url');
  try {
    const state = { search: '?period=last-30', hash: '#totals' };
    receive({ type: 'bridge:initialize', state });
    expect(bridge.snapshot()).toEqual(state);
    expect(writes).toEqual([]);
    expect(
      sent.some(
        message =>
          message.type === 'bridge:request' &&
          message.route === 'navigation:update'
      )
    ).toBe(false);
    const navigation = createDataAppNavigation({
      bridge,
      window: frame,
    });
    expect(writes).toHaveLength(1);
    navigation.dispose();
  } finally {
    bridge.dispose();
  }
});

test('late navigation attachment reads the latest authenticated host state', () => {
  const { bridge, frame, receive, writes } = harness();
  try {
    receive({
      type: 'bridge:initialize',
      state: { search: '?period=last-30', hash: '#totals' },
    });
    receive({
      type: 'state:update',
      state: { search: '?period=last-7', hash: '#daily' },
    });
    const navigation = createDataAppNavigation({ bridge, window: frame });
    expect(navigation.snapshot()).toEqual({
      search: '?period=last-7',
      hash: '#daily',
    });
    expect(writes).toEqual([]);
    let notifications = 0;
    const unsubscribe = navigation.subscribe(() => {
      notifications++;
    });
    receive({
      type: 'state:update',
      token: 'stale',
      state: { search: '?forged=1', hash: '' },
    });
    receive({
      type: 'state:update',
      sessionId: 'stale',
      state: { search: '?forged=1', hash: '' },
    });
    receive(
      { type: 'state:update', state: { search: '?forged=1', hash: '' } },
      'https://other.example'
    );
    receive(
      { type: 'state:update', state: { search: '?forged=1', hash: '' } },
      'https://host.example',
      {}
    );
    receive({
      type: 'state:update',
      state: { search: 'invalid', hash: '#daily' },
    });
    expect(notifications).toBe(0);
    expect(navigation.snapshot().search).toBe('?period=last-7');
    receive({
      type: 'state:update',
      state: { search: '?period=last-30', hash: '#totals' },
    });
    expect(notifications).toBe(1);
    navigation.dispose();
    receive({
      type: 'state:update',
      state: { search: '?period=today', hash: '' },
    });
    navigation.update({ search: '?disposed=1', hash: '' });
    expect(notifications).toBe(1);
    expect(navigation.snapshot().search).toBe('?period=last-30');
    unsubscribe();
  } finally {
    bridge.dispose();
  }
});

test('URL navigation preserves the parent marker and publishes through the shared transport', async () => {
  const { bridge, frame, receive, sent, writes } = harness('url');
  const uninstall = installDataAppTransport(bridge, frame);
  try {
    receive({
      type: 'bridge:initialize',
      state: { search: '?period=last-30', hash: '#totals' },
    });
    const navigation = getDataAppNavigation(frame)!;
    expect(getDataAppNavigation(frame)).toBe(navigation);
    expect(navigation.snapshot()).toEqual({
      search: '?period=last-30',
      hash: '#totals',
    });
    expect(
      new URL(frame.location.href).searchParams.get('__altertable_parent')
    ).toBe('https://host.example');
    const before = writes.length;
    navigation.update({ search: '?period=last-7', hash: '#daily' }, 'push');
    expect(writes).toHaveLength(before + 1);
    const request = sent.at(-1)!;
    if (request.type !== 'bridge:request') throw new Error('Expected request.');
    expect(request.route).toBe('navigation:update');
    expect(request.payload).toEqual({
      search: '?period=last-7',
      hash: '#daily',
      title: 'Navigation fixture',
      mode: 'push',
    });
    receive({ type: 'bridge:result', id: request.id, response: null });
    await Promise.resolve();
    navigation.dispose();
    expect(getDataAppNavigation(frame)).not.toBe(navigation);
    getDataAppNavigation(frame)?.dispose();
  } finally {
    uninstall();
  }
});

import { expect, test } from 'bun:test';
import {
  createDataClient,
  createIframeTransport,
  installDataAppTransport,
  getDataAppTransport,
} from '@altertable/data-app/client';
import { BRIDGE, type BridgeMessage } from '@/src/core/bridge';
import type { connectionCheck } from '@altertable/data-app/contract';

test('data client discovers the iframe while explicit transport and HTTP options retain priority', async () => {
  const global = globalThis as unknown as { window?: Window };
  const previousWindow = global.window;
  const previousFetch = globalThis.fetch;
  const frame = Object.assign(new EventTarget(), {
    parent: { postMessage() {} },
    location: { href: 'https://app.example/' },
  }) as unknown as Window;
  const bridge = createIframeTransport({
    parentOrigin: 'https://host.example',
    window: frame,
  });
  const body = {
    data: true,
    requestId: 'request',
    queriedAt: 'now',
    queryIds: [],
  };
  let iframeCalls = 0;

  async function requestFromIframe() {
    iframeCalls++;

    return { status: 200, body };
  }

  bridge.transport = requestFromIframe;
  const urls: string[] = [];

  async function request(input: string | URL | Request): Promise<Response> {
    urls.push(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    );

    return Response.json(body);
  }

  global.window = frame;
  globalThis.fetch = request as typeof fetch;
  const uninstall = installDataAppTransport(bridge, frame);
  type Operations = { connection: ReturnType<typeof connectionCheck> };
  try {
    await createDataClient<Operations>().query('connection', {});
    expect(iframeCalls).toBe(1);
    await createDataClient<Operations>({ endpoint: '' }).query(
      'connection',
      {}
    );
    await createDataClient<Operations>({
      fetch: request as typeof fetch,
    }).query('connection', {});
    expect(urls).toEqual(['/connection', '/api/data/connection']);
    expect(iframeCalls).toBe(1);
    const response = await createDataClient<Operations>({
      endpoint: '/ignored',
      async transport() {
        return {
          status: 200,
          body: { ...body, requestId: 'custom' },
        };
      },
    }).query('connection', {});
    expect(response.requestId).toBe('custom');
    expect(urls).toHaveLength(2);
  } finally {
    uninstall();
    globalThis.fetch = previousFetch;
    if (previousWindow) global.window = previousWindow;
    else delete global.window;
  }
});

function previewFrame(verify: () => Promise<Response>, topLevel = false) {
  const origin = 'https://host.example';
  const frame = Object.assign(new EventTarget(), {
    location: {
      href: `https://app.example/?__altertable_parent=${encodeURIComponent(origin)}`,
    },
    document: { title: 'Preview fixture' },
    fetch() {
      return verify();
    },
  }) as unknown as Window;
  let handshakes = 0;
  const parent = {
    postMessage(message: BridgeMessage) {
      function receive(data: Partial<BridgeMessage>) {
        frame.dispatchEvent(
          Object.assign(new Event('message'), {
            source: parent,
            origin,
            data: {
              channel: BRIDGE,
              version: 1,
              documentId: message.documentId,
              sessionId: 'preview',
              ...data,
            },
          })
        );
      }
      if (message.type === 'bridge:ready') {
        handshakes++;
        queueMicrotask(() => receive({ type: 'bridge:initialize' }));
      }
      if (message.type === 'bridge:request')
        queueMicrotask(() =>
          receive({
            type: 'bridge:result',
            id: message.id,
            response: {
              status: 200,
              body: {
                data: true,
                requestId: 'preview',
                queriedAt: 'now',
                queryIds: [],
              },
            },
          })
        );
    },
  };
  Object.assign(frame, { parent: topLevel ? frame : parent });

  return {
    frame,
    handshakes(this: void) {
      return handshakes;
    },
  };
}

async function inPreview(frame: Window, run: () => Promise<void>) {
  const globals = globalThis as unknown as { window?: Window };
  const previous = globals.window;
  globals.window = frame;
  try {
    await run();
  } finally {
    getDataAppTransport(frame)?.dispose();
    if (previous) globals.window = previous;
    else delete globals.window;
  }
}

type PreviewOperations = { connection: ReturnType<typeof connectionCheck> };

test('an explicit retry re-verifies a recovered local preview', async () => {
  let fetches = 0;
  const { frame, handshakes } = previewFrame(async () => {
    if (++fetches === 1) throw new Error('Temporary outage');

    return Response.json({ origin: 'https://host.example' });
  });
  await inPreview(frame, async () => {
    const client = createDataClient<PreviewOperations>();
    expect(
      await client.query('connection', {}).catch(error => error)
    ).toMatchObject({
      code: 'bridge_unavailable',
    });
    expect((await client.query('connection', {})).data).toBe(true);
    expect(
      (await createDataClient<PreviewOperations>().query('connection', {})).data
    ).toBe(true);
    expect(fetches).toBe(2);
    expect(handshakes()).toBe(1);
  });
});

test('concurrent preview callers share verification and cancellation affects only its caller', async () => {
  let fetches = 0;
  const config = Promise.withResolvers<Response>();
  const { frame, handshakes } = previewFrame(() => {
    fetches++;
    return config.promise;
  });
  await inPreview(frame, async () => {
    const client = createDataClient<PreviewOperations>();
    const controller = new AbortController();
    const first = client.query('connection', {}, { signal: controller.signal });
    const second = createDataClient<PreviewOperations>().query(
      'connection',
      {}
    );
    controller.abort();
    expect(await first.catch(error => error)).toMatchObject({
      name: 'AbortError',
    });
    expect(fetches).toBe(1);
    config.resolve(Response.json({ origin: 'https://host.example' }));
    expect((await second).data).toBe(true);
    expect(handshakes()).toBe(1);
  });
});

test('preview retries continue rejecting mismatched origins and top-level windows', async () => {
  for (const topLevel of [false, true]) {
    let fetches = 0;
    const { frame, handshakes } = previewFrame(async () => {
      fetches++;

      return Response.json({
        origin: topLevel ? 'https://host.example' : 'https://evil.example',
      });
    }, topLevel);
    await inPreview(frame, async () => {
      const client = createDataClient<PreviewOperations>();
      for (let attempt = 0; attempt < 2; attempt++) {
        expect(
          await client.query('connection', {}).catch(error => error)
        ).toMatchObject({
          code: 'bridge_unavailable',
        });
      }
      expect(fetches).toBe(2);
      expect(handshakes()).toBe(0);
    });
  }
});

test('pending verification cannot overwrite a transport installed by another owner', async () => {
  const config = Promise.withResolvers<Response>();
  const { frame, handshakes } = previewFrame(() => config.promise);
  await inPreview(frame, async () => {
    const client = createDataClient<PreviewOperations>();
    const pending = client.query('connection', {});
    const installed = createIframeTransport({
      parentOrigin: 'https://host.example',
      window: frame,
    });
    const uninstall = installDataAppTransport(installed, frame);
    try {
      config.resolve(Response.json({ origin: 'https://host.example' }));
      expect((await pending).data).toBe(true);
      expect(getDataAppTransport(frame)).toBe(installed);
      expect(handshakes()).toBe(1);
    } finally {
      uninstall();
    }
  });
});

test('HTTP and iframe delivery reject the same malformed success envelopes', async () => {
  const { defineDataQueryRoute } =
    await import('@altertable/data-app/contract');
  const valid = {
    data: true,
    requestId: 'request',
    queriedAt: 'now',
    queryIds: [],
  };
  const bodies = [
    {},
    { requestId: 'request', queriedAt: 'now', queryIds: [] },
    { ...valid, requestId: undefined },
    { ...valid, queriedAt: undefined },
    { ...valid, queryIds: [1] },
    { ...valid, queries: [{ name: 'query', statement: 1 }] },
    [],
  ];
  for (const body of bodies) {
    const client = createDataClient({
      fetch: Object.assign(async () => Response.json(body), {
        preconnect() {},
      }),
    });
    expect(
      await client.query('connection', {}).catch(error => error)
    ).toMatchObject({ code: 'invalid_response' });
    expect(() =>
      defineDataQueryRoute().output(
        { status: 200, body },
        { operation: 'connection', input: {} }
      )
    ).toThrow();
  }
});

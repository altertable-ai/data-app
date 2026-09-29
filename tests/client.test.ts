import { expect, test } from 'bun:test';
import {
  createDataClient,
  createIframeTransport,
  installDataAppTransport,
} from '@/src/client/index';
import type { connectionCheck } from '@/src/core/contract';

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

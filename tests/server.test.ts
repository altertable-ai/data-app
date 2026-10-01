import { expect, test } from 'bun:test';
import {
  defineOperation,
  defineQueryNames,
  parseCount,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';
import { localLakehouse } from '@altertable/data-app/server/bun';
const totalsOperation = defineOperation({
  checks: [1],
  queryNames: defineQueryNames({ totals: 'totals' }),
  input(value: unknown) {
    if (value !== 1) throw new Error('Bad input');

    return 1;
  },
  output(value: unknown) {
    return value as number;
  },
  policy: { maxQueryRows: 1, maxDurationMs: 1000, exposeSql: true },
  async run({ lakehouse, signal }) {
    const result = await lakehouse.queryAll('SELECT 1', {
      limit: 20,
      signal,
      name: 'totals',
    });

    return result.rows.length;
  },
});

function totalsRequest(value: unknown) {
  return new Request('http://localhost/api/data/totals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
}

test('HTTP operations validate inputs, enforce row policy, and disclose permitted evidence', async () => {
  let requestedLimit = 0;
  const handle = createDataHandler({ totals: totalsOperation }, async () => ({
    canDiscloseSql: true,
    lakehouse: {
      async queryAll(_statement: string, options: { limit: number }) {
        requestedLimit = options.limit;

        return { columns: [], rows: [[1]], queryId: 'query-1' };
      },
    },
  }));

  const valid = await handle(totalsRequest(1));
  expect(valid.status).toBe(200);
  const response = await valid.json();
  expect(response).not.toHaveProperty('evidence');
  expect(response).toMatchObject({
    data: 1,
    queryIds: ['query-1'],
    queries: [{ name: 'totals', statement: 'SELECT 1', queryId: 'query-1' }],
  });
  expect(requestedLimit).toBe(1);
  const unregistered = createDataHandler(
    {
      totals: {
        ...totalsOperation,
        async run({ lakehouse, signal }) {
          await lakehouse.queryAll('SELECT 1', {
            limit: 1,
            signal,
            name: 'other',
          });

          return 1;
        },
      },
    },
    async () => ({
      canDiscloseSql: true,
      lakehouse: {
        async queryAll() {
          return { columns: [], rows: [] };
        },
      },
    })
  );
  expect((await unregistered(totalsRequest(1))).status).toBe(502);
  const restricted = createDataHandler(
    { totals: totalsOperation },
    async () => ({
      canDiscloseSql: false,
      lakehouse: {
        async queryAll() {
          return { columns: [], rows: [[1]] };
        },
      },
    })
  );
  expect(await (await restricted(totalsRequest(1))).json()).not.toHaveProperty(
    'queries'
  );
  expect((await handle(totalsRequest(2))).status).toBe(400);
  expect(
    (await handle(new Request('http://localhost/api/data/other'))).status
  ).toBe(404);
});

test('HTTP requests require JSON and an allowed same-origin delivery context', async () => {
  const handle = createDataHandler({ totals: totalsOperation }, async () => ({
    canDiscloseSql: false,
    lakehouse: {
      async queryAll() {
        return { columns: [], rows: [] };
      },
    },
  }));
  for (const { headers, status } of [
    { headers: { 'content-type': 'text/plain' }, status: 415 },
    {
      headers: {
        'content-type': 'application/json',
        origin: 'http://other.example',
      },
      status: 403,
    },
    {
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
        'sec-fetch-site': 'cross-site',
      },
      status: 403,
    },
    {
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
      },
      status: 200,
    },
  ]) {
    const response = await handle(
      new Request('http://localhost/api/data/totals', {
        method: 'POST',
        headers,
        body: '1',
      })
    );
    expect(response.status).toBe(status);
  }
});

test('HTTP handlers hide private failures and preserve adapter authentication errors', async () => {
  const source = localLakehouse(
    {
      ALTERTABLE_LAKEHOUSE_USERNAME: 'user',
      ALTERTABLE_LAKEHOUSE_PASSWORD: 'secret',
    },
    Object.assign(
      async () => new Response('private upstream detail', { status: 401 }),
      {
        preconnect() {},
      }
    )
  );
  const failing = createDataHandler({ totals: totalsOperation }, async () => ({
    canDiscloseSql: false,
    lakehouse: {
      async queryAll() {
        throw new Error('private upstream detail');
      },
    },
  }));
  const failure = await failing(totalsRequest(1));
  expect(failure.status).toBe(502);
  expect(JSON.stringify(await failure.json())).not.toContain(
    'private upstream detail'
  );
  const sourceFailure = createDataHandler(
    { totals: totalsOperation },
    async () => ({
      canDiscloseSql: false,
      lakehouse: source,
    })
  );
  const upstreamFailure = await sourceFailure(totalsRequest(1));
  expect(upstreamFailure.status).toBe(502);
  expect(await upstreamFailure.json()).toMatchObject({
    error: {
      code: 'source_unauthorized',
      message: expect.stringContaining('authenticate its data connection'),
    },
  });
  const forbidden = createDataHandler({ totals: totalsOperation }, async () => {
    throw new Error('private authorization detail');
  });
  const denied = await forbidden(totalsRequest(1));
  expect(denied.status).toBe(403);
  expect(JSON.stringify(await denied.json())).not.toContain(
    'private authorization detail'
  );
});

function cancellationOperation(run: (signal: AbortSignal) => Promise<number>) {
  return defineOperation({
    input(value: unknown) {
      return value;
    },
    output(value: unknown) {
      return parseCount(value);
    },
    checks: [{}],
    policy: { maxQueryRows: 1, maxDurationMs: 1000, exposeSql: false },
    run({ signal }) {
      return run(signal);
    },
  });
}

async function responseWithin(response: Promise<Response>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      response,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Handler did not settle after cancellation.')),
          100
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function cancellableRequest(controller: AbortController) {
  return new Request('http://localhost/api/data/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal: controller.signal,
  });
}

const cancellationAccess = {
  canDiscloseSql: false,
  lakehouse: {
    async queryAll() {
      return { columns: [], rows: [] };
    },
  },
};

test('cancellation during authorization prevents operation execution', async () => {
  const controller = new AbortController();
  let calls = 0;
  const handler = createDataHandler(
    {
      cancel: cancellationOperation(async () => {
        calls++;

        return new Promise(() => {});
      }),
    },
    async () => {
      controller.abort();

      return cancellationAccess;
    }
  );
  const response = await responseWithin(
    handler(cancellableRequest(controller))
  );
  expect(response.status).toBe(504);
  expect(calls).toBe(0);
});

test('synchronous startup cancellation settles even when the operation never does', async () => {
  const controller = new AbortController();
  const handler = createDataHandler(
    {
      cancel: cancellationOperation(async () => {
        controller.abort();

        return new Promise(() => {});
      }),
    },
    async () => cancellationAccess
  );
  const response = await responseWithin(
    handler(cancellableRequest(controller))
  );
  expect(response.status).toBe(504);
  expect((await response.json()).error.code).toBe('timeout');
});

test('later cancellation settles an operation that ignores its signal', async () => {
  const controller = new AbortController();
  const handler = createDataHandler(
    {
      cancel: cancellationOperation(async () => {
        setTimeout(() => controller.abort(), 0);

        return new Promise(() => {});
      }),
    },
    async () => cancellationAccess
  );
  expect(
    (await responseWithin(handler(cancellableRequest(controller)))).status
  ).toBe(504);
});

test('execution deadlines settle operations that ignore cancellation', async () => {
  const operation = cancellationOperation(async () => new Promise(() => {}));
  operation.policy.maxDurationMs = 10;
  const handler = createDataHandler(
    { cancel: operation },
    async () => cancellationAccess
  );
  expect(
    (await responseWithin(handler(cancellableRequest(new AbortController()))))
      .status
  ).toBe(504);
});

test('operation success and synchronous failure remove cancellation listeners', async () => {
  const originalAdd = Reflect.get(
    AbortSignal.prototype,
    'addEventListener'
  ) as AbortSignal['addEventListener'];
  const originalRemove = Reflect.get(
    AbortSignal.prototype,
    'removeEventListener'
  ) as AbortSignal['removeEventListener'];
  const active = new Map<
    AbortSignal,
    Set<EventListenerOrEventListenerObject>
  >();
  AbortSignal.prototype.addEventListener = function addListener(
    this: AbortSignal,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    if (type === 'abort' && listener) {
      const listeners = active.get(this) ?? new Set();
      listeners.add(listener);
      active.set(this, listeners);
    }

    return originalAdd.call(this, type, listener, options);
  };
  AbortSignal.prototype.removeEventListener = function removeListener(
    this: AbortSignal,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    if (type === 'abort' && listener) active.get(this)?.delete(listener);

    return originalRemove.call(this, type, listener, options);
  };
  try {
    for (const fail of [false, true]) {
      let executionSignal: AbortSignal | undefined;
      const handler = createDataHandler(
        {
          cancel: cancellationOperation(signal => {
            executionSignal = signal;
            if (fail) throw new Error('Synchronous failure');

            return Promise.resolve(1);
          }),
        },
        async () => cancellationAccess
      );
      expect(
        (await handler(cancellableRequest(new AbortController()))).status
      ).toBe(fail ? 502 : 200);
      expect(executionSignal).toBeDefined();
      expect(active.get(executionSignal!)?.size).toBe(0);
    }
  } finally {
    AbortSignal.prototype.addEventListener = originalAdd;
    AbortSignal.prototype.removeEventListener = originalRemove;
  }
});

function streamedRequest(
  chunks: Uint8Array[],
  options: {
    length?: string;
    signal?: AbortSignal;
    fail?: boolean;
    wait?: boolean;
    slowCancel?: boolean;
  } = {}
) {
  const state = { pulls: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        state.pulls++;
        if (options.fail) {
          controller.error(new Error('Private stream failure'));
          return;
        }
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else if (!options.wait) controller.close();
      },
      cancel() {
        state.cancelled = true;
        if (options.slowCancel) return new Promise(() => {});
      },
    },
    { highWaterMark: 0 }
  );
  const request = new Request('http://localhost/api/data/cancel', {
    method: 'POST',
    body,
    signal: options.signal,
    headers: {
      'content-type': 'application/json',
      ...(options.length && { 'content-length': options.length }),
    },
  });

  return { request, state };
}

function inputHandler(onRun: () => void = () => {}) {
  return createDataHandler(
    {
      cancel: cancellationOperation(async () => {
        onRun();
        return 1;
      }),
    },
    async () => cancellationAccess
  );
}

test('HTTP inputs enforce the exact UTF-8 byte boundary', async () => {
  const encode = new TextEncoder();
  const handler = inputHandler();
  for (const text of [
    JSON.stringify('a'.repeat(16382)),
    JSON.stringify('é'.repeat(8191)),
  ]) {
    expect(encode.encode(text).byteLength).toBe(16384);
    expect(
      (await handler(streamedRequest([encode.encode(text)]).request)).status
    ).toBe(200);
  }
  for (const text of [
    JSON.stringify('a'.repeat(16383)),
    JSON.stringify('é'.repeat(8192)),
  ]) {
    const response = await handler(
      streamedRequest([encode.encode(text)]).request
    );
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe('input_too_large');
  }
});

test('oversize input cancels remaining consumption regardless of Content-Length', async () => {
  for (const length of [undefined, '1', '999999']) {
    let calls = 0;
    const { request, state } = streamedRequest(
      [new Uint8Array(16385), new Uint8Array(20000)],
      { length, slowCancel: true }
    );
    const response = await responseWithin(inputHandler(() => calls++)(request));
    expect(response.status).toBe(413);
    expect(state.pulls).toBe(1);
    expect(state.cancelled).toBe(true);
    expect(request.body?.locked).toBe(false);
    expect(calls).toBe(0);
  }
});

test('empty, malformed and failed streams keep safe input errors', async () => {
  const encode = new TextEncoder();
  for (const fixture of [
    streamedRequest([]),
    streamedRequest([encode.encode('{')]),
    streamedRequest([], { fail: true }),
  ]) {
    const response = await inputHandler()(fixture.request);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: 'invalid_input',
      message: "Check this operation's inputs.",
    });
  }
});

test('authorization rejects requests without reading their bodies', async () => {
  const { request, state } = streamedRequest([new Uint8Array(16385)]);
  const handler = createDataHandler(
    { cancel: cancellationOperation(async () => 1) },
    async () => {
      throw new Error('Denied');
    }
  );
  expect((await handler(request)).status).toBe(403);
  expect(state.pulls).toBe(0);
  expect(state.cancelled).toBe(false);
});

test('cancellation settles waiting body reads without awaiting stream cancellation', async () => {
  const controller = new AbortController();
  const { request, state } = streamedRequest([], {
    wait: true,
    signal: controller.signal,
    slowCancel: true,
  });
  const pending = inputHandler()(request);
  setTimeout(() => controller.abort(), 0);
  const response = await responseWithin(pending);
  expect(response.status).toBe(400);
  expect(request.body?.locked).toBe(false);
  expect(state.cancelled).toBe(true);
  expect((await response.json()).error.code).toBe('invalid_input');
});

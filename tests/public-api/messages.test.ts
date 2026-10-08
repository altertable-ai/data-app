import { expect, test } from 'vitest';
import {
  createMessageRouter,
  defineMessageRoute,
  defineDataQueryRoute,
  navigationUpdateRoute,
  MessageRoutingError,
  registeredQueryRoute,
  DataSourceError,
} from '@altertable/data-app/contract';
import { createMessageClient } from '@altertable/data-app/client';
import {
  createNavigationHandler,
  createRegisteredQueryHandler,
} from '@altertable/data-app/embed';

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('Private parser detail');

  return value;
}

const routes = {
  'math:double': defineMessageRoute({ input: number, output: number }),
};

function context() {
  return { signal: new AbortController().signal };
}

test('typed routes validate both boundaries and reject unknown routes before invoking a handler', async () => {
  let calls = 0;
  const router = createMessageRouter(routes, {
    'math:double'(value) {
      calls++;

      return value * 2;
    },
  });
  const client = createMessageClient(routes, message =>
    router.dispatch(message, context())
  );
  expect(await client.request('math:double', 7)).toBe(14);
  expect(calls).toBe(1);
  for (const route of ['missing', '__proto__', 'constructor'])
    expect(
      await router
        .dispatch({ route, payload: 1 }, context())
        .catch(error => error)
    ).toMatchObject({ code: 'unknown_route' });
  expect(
    await router
      .dispatch({ route: 'math:double', payload: '7' }, context())
      .catch(error => error)
  ).toMatchObject({
    code: 'invalid_payload',
    message: 'Invalid message payload.',
  });
  expect(calls).toBe(1);
  const invalid = createMessageRouter(routes, {
    'math:double'() {
      return NaN;
    },
  });
  expect(
    await invalid
      .dispatch({ route: 'math:double', payload: 1 }, context())
      .catch(error => error)
  ).toMatchObject({ code: 'invalid_response' });
  const forged = createMessageClient(routes, async () => 'bad response');
  expect(
    await forged.request('math:double', 1).catch(error => error)
  ).toMatchObject({
    code: 'invalid_response',
  });
});

test('an operation message client validates delivered data and preserves public errors', async () => {
  const route = defineDataQueryRoute({
    count: { input: number, output: number },
  });
  const envelope = {
    data: 3,
    requestId: 'request',
    queriedAt: '2026-09-30T00:00:00Z',
    queryIds: ['q1'],
    queries: [{ name: 'totals', statement: 'SELECT 3', queryId: 'q1' }],
  };
  let response: unknown = { status: 200, body: envelope };
  const client = createMessageClient(
    { 'data:query': route },
    async () => response
  );
  await expect(
    client.request('data:query', { operation: 'count', input: 1 })
  ).resolves.toEqual(response);
  await expect(
    // @ts-expect-error JavaScript callers can still send an unknown operation.
    client.request('data:query', { operation: 'missing', input: 1 })
  ).rejects.toMatchObject({ code: 'invalid_payload' });
  await expect(
    // @ts-expect-error JavaScript callers can still supply an invalid input.
    client.request('data:query', { operation: 'count', input: '1' })
  ).rejects.toMatchObject({ code: 'invalid_payload' });
  response = { status: 200, body: { ...envelope, data: 'wrong' } };
  await expect(
    client.request('data:query', { operation: 'count', input: 1 })
  ).rejects.toMatchObject({ code: 'invalid_response' });
  response = {
    status: 403,
    body: {
      error: {
        code: 'forbidden',
        message: 'Denied',
        requestId: 'denied-request',
      },
    },
  };
  await expect(
    client.request('data:query', { operation: 'count', input: 1 })
  ).rejects.toMatchObject({
    code: 'forbidden',
    message: 'Denied',
    requestId: 'denied-request',
  });
});

test('navigation route validates mode and location and preserves reserved host parameters', async () => {
  let href =
    'https://host.example/apps/report?workspace=one&workspace=two&period=last-30#totals';
  const history: { mode: string; href: string }[] = [];
  const host = {
    location: {
      get href() {
        return href;
      },
    },
    document: { title: 'Host' },
    history: {
      pushState(_: unknown, __: string, url: URL) {
        href = url.href;
        history.push({ mode: 'push', href });
      },
      replaceState(_: unknown, __: string, url: URL) {
        href = url.href;
        history.push({ mode: 'replace', href });
      },
    },
  } as unknown as Window;
  const router = createMessageRouter(
    { 'navigation:update': navigationUpdateRoute },
    {
      'navigation:update': createNavigationHandler({
        window: host,
        reservedSearchParams: ['workspace'],
      }),
    }
  );
  expect(
    await router.dispatch(
      {
        route: 'navigation:update',
        payload: {
          search: '?period=last-7&workspace=forged&__altertable_parent=x',
          hash: '#daily',
          mode: 'push',
          title: 'Activity',
        },
      },
      context()
    )
  ).toBeNull();
  expect(href).toBe(
    'https://host.example/apps/report?period=last-7&workspace=one&workspace=two#daily'
  );
  expect(host.document.title).toBe('Activity');
  expect(history[0]!.mode).toBe('push');
  const before = href;
  for (const payload of [
    { search: 'https://evil.example', hash: '', mode: 'push' },
    { search: '', hash: '', mode: 'reload' },
  ])
    expect(
      await router
        .dispatch({ route: 'navigation:update', payload }, context())
        .catch(error => error)
    ).toMatchObject({ code: 'invalid_payload' });
  expect(href).toBe(before);
});

test('routing checks cancellation before and after handlers', async () => {
  const controller = new AbortController();
  const router = createMessageRouter(routes, {
    'math:double'(value) {
      controller.abort();

      return value;
    },
  });
  expect(
    await router
      .dispatch(
        { route: 'math:double', payload: 1 },
        { signal: controller.signal }
      )
      .catch(error => error)
  ).toMatchObject({ name: 'AbortError' });
});

test('a registered query client rejects malformed requests and malformed upstream results', async () => {
  const input = { operation: 'count', variables: { country: 'FR' }, limit: 1 };
  const result = { columns: [{ name: 'n' }], rows: [[1]], queryId: 'q' };
  let response: unknown = result;
  const router = createMessageRouter(
    { 'data:query': registeredQueryRoute },
    { 'data:query': () => response as typeof result }
  );
  const client = createMessageClient(
    { 'data:query': registeredQueryRoute },
    message => router.dispatch(message, context())
  );
  await expect(client.request('data:query', input)).resolves.toEqual(result);
  response = { ...result, statement: 'SELECT private' };
  await expect(client.request('data:query', input)).resolves.toEqual(result);
  response = result;
  for (const payload of [
    null,
    {},
    { ...input, operation: '' },
    { ...input, limit: 0 },
    { ...input, limit: 1.5 },
    { ...input, limit: Number.MAX_SAFE_INTEGER + 1 },
    { ...input, statement: 'SELECT 1' },
    { ...input, variables: ['FR'] },
    { ...input, variables: { country: ['FR'] } },
    { ...input, variables: { country: { code: 'FR' } } },
    { ...input, variables: { count: Number.NaN } },
  ]) {
    await expect(
      router.dispatch({ route: 'data:query', payload }, context())
    ).rejects.toMatchObject({ code: 'invalid_payload' });
  }
  for (const body of [
    null,
    { ...result, rows: [[1], [2]] },
    { ...result, rows: [['wrong', 'width']] },
    { ...result, columns: [{}] },
    { ...result, queryId: 1 },
  ]) {
    response = body;
    await expect(client.request('data:query', input)).rejects.toMatchObject({
      code: 'invalid_response',
    });
  }
});

test('registered query host authorizes each request, preserves source errors, and hides private failures', async () => {
  let authorizations = 0;
  const router = createMessageRouter(
    { 'data:query': registeredQueryRoute },
    {
      'data:query': createRegisteredQueryHandler(
        async ({ operation }, { signal }) => {
          authorizations++;
          expect(signal.aborted).toBe(false);
          if (operation === 'denied') throw new Error('private auth');
          return {
            async queryById(name, values, options) {
              expect(name).toBe(operation);
              expect(values).toEqual({ country: 'FR' });
              expect(options.signal).toBe(signal);
              if (name === 'busy') throw new DataSourceError('rate_limited');
              throw new Error('private query');
            },
          };
        }
      ),
    }
  );
  const ctx = context();
  for (const [operation, code] of [
    ['denied', 'forbidden'],
    ['busy', 'source_rate_limited'],
    ['failure', 'query_failed'],
  ]) {
    const error = await router
      .dispatch(
        {
          route: 'data:query',
          payload: { operation, variables: { country: 'FR' }, limit: 1 },
        },
        ctx
      )
      .catch(error => error);
    expect(error).toBeInstanceOf(MessageRoutingError);
    if (!(error instanceof MessageRoutingError))
      throw new Error('Expected a public routing error.');
    expect(error.code).toBe(code);
    expect(error.requestId).toEqual(expect.any(String));
    expect(error.message).not.toContain('private');
  }
  expect(authorizations).toBe(3);
  const cancelled = new AbortController();
  cancelled.abort();
  const error = await router
    .dispatch(
      {
        route: 'data:query',
        payload: { operation: 'busy', variables: { country: 'FR' }, limit: 1 },
      },
      { signal: cancelled.signal }
    )
    .catch(error => error);
  expect(error).toMatchObject({ name: 'AbortError' });
  expect(authorizations).toBe(3);
});

test('registered query host authentication failures give browser viewers actionable messages', async () => {
  for (const reason of ['unauthorized', 'forbidden'] as const) {
    const handler = createRegisteredQueryHandler(async () => ({
      async queryById() {
        throw new DataSourceError(reason);
      },
    }));
    const error = await handler(
      { operation: 'count', variables: {}, limit: 1 },
      context()
    ).catch(error => error);
    expect(error.message).not.toMatch(/altertable|profile|CLI/);
    expect(error).toMatchObject({
      code: `source_${reason}`,
      message: expect.stringContaining('app owner'),
    });
  }
});

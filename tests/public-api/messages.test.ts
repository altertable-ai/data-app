import { expect, test } from 'vitest';
import {
  createMessageRouter,
  defineMessageRoute,
  defineDataQueryRoute,
  navigationUpdateRoute,
  MessageRoutingError,
  sqlQueryRoute,
  DataSourceError,
} from '@altertable/data-app/contract';
import { createMessageClient } from '@altertable/data-app/client';
import {
  createNavigationHandler,
  createSqlQueryHandler,
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

test('a SQL message client rejects malformed requests and malformed upstream results', async () => {
  const input = { statement: 'SELECT 1', limit: 1 };
  const result = { columns: [{ name: 'n' }], rows: [[1]], queryId: 'q' };
  let response: unknown = result;
  const router = createMessageRouter(
    { 'data:sql': sqlQueryRoute },
    { 'data:sql': () => response as typeof result }
  );
  const client = createMessageClient({ 'data:sql': sqlQueryRoute }, message =>
    router.dispatch(message, context())
  );
  await expect(client.request('data:sql', input)).resolves.toEqual(result);
  for (const payload of [
    null,
    {},
    { statement: '', limit: 1 },
    { statement: 'SELECT 1', limit: 0 },
    { statement: 'SELECT 1', limit: 1.5 },
    { statement: 'SELECT 1', limit: Number.MAX_SAFE_INTEGER + 1 },
    { statement: 'SELECT $value', limit: 1, params: { value: [] } },
    { statement: 'SELECT $value', limit: 1, params: null },
  ]) {
    await expect(
      router.dispatch({ route: 'data:sql', payload }, context())
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
    await expect(client.request('data:sql', input)).rejects.toMatchObject({
      code: 'invalid_response',
    });
  }
});

test('SQL host authorizes each request, preserves source errors, and hides private failures', async () => {
  let authorizations = 0;
  const router = createMessageRouter(
    { 'data:sql': sqlQueryRoute },
    {
      'data:sql': createSqlQueryHandler(async ({ statement }, { signal }) => {
        authorizations++;
        expect(signal.aborted).toBe(false);
        if (statement === 'denied') throw new Error('private auth');
        return {
          async queryAll(_, options) {
            expect(options.signal).toBe(signal);
            if (statement === 'busy') throw new DataSourceError('rate_limited');
            throw new Error('private query');
          },
        };
      }),
    }
  );
  const ctx = context();
  for (const [statement, code] of [
    ['denied', 'forbidden'],
    ['busy', 'source_rate_limited'],
    ['failure', 'query_failed'],
  ]) {
    const error = await router
      .dispatch({ route: 'data:sql', payload: { statement, limit: 1 } }, ctx)
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
      { route: 'data:sql', payload: { statement: 'busy', limit: 1 } },
      { signal: cancelled.signal }
    )
    .catch(error => error);
  expect(error).toMatchObject({ name: 'AbortError' });
  expect(authorizations).toBe(3);
});

test('SQL host authentication failures give browser viewers actionable messages', async () => {
  for (const reason of ['unauthorized', 'forbidden'] as const) {
    const handler = createSqlQueryHandler(async () => ({
      async queryAll() {
        throw new DataSourceError(reason);
      },
    }));
    const error = await handler(
      { statement: 'SELECT 1', limit: 1 },
      context()
    ).catch(error => error);
    expect(error.message).not.toMatch(/altertable|profile|CLI/);
    expect(error).toMatchObject({
      code: `source_${reason}`,
      message: expect.stringContaining('app owner'),
    });
  }
});

test('SQL delivery forwards statements and parameters unchanged through host authorization', async () => {
  const input = {
    statement: 'SELECT $value',
    limit: 1,
    params: { value: "raw\n' $value" },
  };
  let calls = 0;
  const router = createMessageRouter(
    { 'data:sql': sqlQueryRoute },
    {
      'data:sql': createSqlQueryHandler(async (query, { signal }) => {
        expect(query).toEqual(input);
        return {
          async queryAll(statement, options) {
            calls++;
            expect(statement).toBe(input.statement);
            expect(options).toEqual({ limit: 1, params: input.params, signal });
            return {
              columns: [{ name: 'value' }],
              rows: [[input.params.value]],
            };
          },
        };
      }),
    }
  );
  expect(
    await router.dispatch({ route: 'data:sql', payload: input }, context())
  ).toMatchObject({ rows: [[input.params.value]] });
  expect(calls).toBe(1);
});

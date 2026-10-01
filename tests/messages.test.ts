import { expect, test } from 'bun:test';
import {
  createMessageRouter,
  defineMessageRoute,
  defineDataQueryRoute,
  navigationUpdateRoute,
  MessageRoutingError,
} from '@/src/core/messages';
import { createMessageClient } from '@/src/client/messages';
import { createNavigationHandler } from '@/src/embed/navigation';

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

test('operation route validates the selected input and output, preserving evidence and public errors', async () => {
  const contracts = { count: { input: number, output: number } };
  const route = defineDataQueryRoute(contracts);
  expect(() => route.input({ operation: 'missing', input: 1 })).toThrow();
  expect(() => route.input({ operation: 'count', input: '1' })).toThrow();
  const envelope = {
    data: 3,
    requestId: 'request',
    queriedAt: '2026-09-30T00:00:00Z',
    queryIds: ['q1'],
    queries: [{ name: 'totals', statement: 'SELECT 3', queryId: 'q1' }],
  };
  const router = createMessageRouter(
    { 'data:query': route },
    {
      'data:query'() {
        return { status: 200, body: envelope };
      },
    }
  );
  const client = createMessageClient({ 'data:query': route }, message =>
    router.dispatch(message, context())
  );
  expect(
    await client.request('data:query', { operation: 'count', input: 1 })
  ).toEqual({
    status: 200,
    body: envelope,
  });
  expect(() =>
    route.output(
      { status: 200, body: { ...envelope, data: 'wrong' } },
      { operation: 'count', input: 1 }
    )
  ).toThrow();
  expect(() =>
    route.output(
      {
        status: 403,
        body: {
          error: {
            code: 'forbidden',
            message: 'Denied',
            requestId: 'denied-request',
          },
        },
      },
      { operation: 'count', input: 1 }
    )
  ).toThrow(MessageRoutingError);
  try {
    route.output(
      {
        status: 403,
        body: {
          error: {
            code: 'forbidden',
            message: 'Denied',
            requestId: 'denied-request',
          },
        },
      },
      { operation: 'count', input: 1 }
    );
  } catch (error) {
    expect(error).toMatchObject({
      code: 'forbidden',
      requestId: 'denied-request',
    });
  }
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

test('SQL route validates statements, safe row bounds, and result shape', async () => {
  const { sqlQueryRoute } = await import('@/src/core/messages');
  for (const value of [
    null,
    {},
    { statement: '', limit: 1 },
    { statement: 'SELECT 1', limit: 0 },
    { statement: 'SELECT 1', limit: 1.5 },
    { statement: 'SELECT 1', limit: Number.MAX_SAFE_INTEGER + 1 },
  ])
    expect(() => sqlQueryRoute.input(value)).toThrow();
  const input = { statement: 'SELECT 1', limit: 1 };
  expect(sqlQueryRoute.input({ ...input, credentials: 'discard' })).toEqual(
    input
  );
  const result = { columns: [{ name: 'n' }], rows: [[1]], queryId: 'q' };
  expect(sqlQueryRoute.output(result, input)).toEqual(result);
  for (const value of [
    null,
    { ...result, rows: [[1], [2]] },
    { ...result, rows: [['wrong', 'width']] },
    { ...result, columns: [{}] },
    { ...result, queryId: 1 },
  ])
    expect(() => sqlQueryRoute.output(value, input)).toThrow();
});

test('SQL host authorizes each request, preserves source errors, and hides private failures', async () => {
  const { sqlQueryRoute } = await import('@/src/core/messages');
  const { createSqlQueryHandler } = await import('@/src/embed/sql');
  const { DataSourceError } = await import('@/src/core/contract');
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
  const { createSqlQueryHandler } = await import('@/src/embed/sql');
  const { DataSourceError } = await import('@/src/core/contract');
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

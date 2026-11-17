import { createNavigationHandler } from '@altertable/data-app-embed';
import { createMessageClient } from '@altertable/data-app/client';
import {
  createMessageRouter,
  defineMessageRoute,
  defineDataOperationRoute,
  dataAppRoutes,
  registeredQueryRoute,
  navigationUpdateRoute,
} from '@altertable/data-app/contract';
import { expect, test } from 'vitest';

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

test('default iframe routes expose registered queries and navigation only', () => {
  expect(Object.keys(dataAppRoutes)).toEqual([
    'data:query',
    'navigation:update',
  ]);
});

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

test('an operation message client validates input and the response envelope and preserves public errors', async () => {
  const route = defineDataOperationRoute({
    count: { input: number },
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
    { 'test:operation': route },
    async () => response
  );
  await expect(
    client.request('test:operation', { operation: 'count', input: 1 })
  ).resolves.toEqual(response);
  await expect(
    // @ts-expect-error JavaScript callers can still send an unknown operation.
    client.request('test:operation', { operation: 'missing', input: 1 })
  ).rejects.toMatchObject({ code: 'invalid_payload' });
  await expect(
    // @ts-expect-error JavaScript callers can still supply an invalid input.
    client.request('test:operation', { operation: 'count', input: '1' })
  ).rejects.toMatchObject({ code: 'invalid_payload' });
  response = { status: 200, body: { ...envelope, queryIds: 'q1' } };
  await expect(
    client.request('test:operation', { operation: 'count', input: 1 })
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
    client.request('test:operation', { operation: 'count', input: 1 })
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

test('registered query messages carry an ID and parameters without SQL', async () => {
  const input = {
    queryId: 'salesByRegion',
    limit: 5,
    params: { region: 'EU' },
  };
  const result = { columns: [{ name: 'total' }], rows: [[42]], queryId: 'q1' };
  const router = createMessageRouter(
    { 'data:query': registeredQueryRoute },
    { 'data:query': () => result }
  );
  const client = createMessageClient(
    { 'data:query': registeredQueryRoute },
    message => router.dispatch(message, context())
  );
  await expect(client.request('data:query', input)).resolves.toEqual(result);
  for (const payload of [
    { statement: 'SELECT 1', limit: 1 },
    { queryId: '', limit: 1 },
    { queryId: 'salesByRegion', limit: 0 },
    { queryId: 'salesByRegion', limit: 10_001 },
    { queryId: 'salesByRegion', limit: 1, params: { region: [] } },
  ])
    await expect(
      router.dispatch({ route: 'data:query', payload }, context())
    ).rejects.toMatchObject({ code: 'invalid_payload' });
});

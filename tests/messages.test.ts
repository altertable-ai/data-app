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
  double: defineMessageRoute({ input: number, output: number }),
};

function context() {
  return { signal: new AbortController().signal };
}

test('typed routes validate both boundaries and reject unknown routes before invoking a handler', async () => {
  let calls = 0;
  const router = createMessageRouter(routes, {
    double(value) {
      calls++;

      return value * 2;
    },
  });
  const client = createMessageClient(routes, message =>
    router.dispatch(message, context())
  );
  expect(await client.request('double', 7)).toBe(14);
  expect(calls).toBe(1);
  for (const route of ['missing', '__proto__', 'constructor'])
    expect(
      await router
        .dispatch({ route, payload: 1 }, context())
        .catch(error => error)
    ).toMatchObject({ code: 'unknown_route' });
  expect(
    await router
      .dispatch({ route: 'double', payload: '7' }, context())
      .catch(error => error)
  ).toMatchObject({
    code: 'invalid_payload',
    message: 'Invalid message payload.',
  });
  expect(calls).toBe(1);
  const invalid = createMessageRouter(routes, {
    double() {
      return NaN;
    },
  });
  expect(
    await invalid
      .dispatch({ route: 'double', payload: 1 }, context())
      .catch(error => error)
  ).toMatchObject({ code: 'invalid_response' });
  const forged = createMessageClient(routes, async () => 'bad response');
  expect(await forged.request('double', 1).catch(error => error)).toMatchObject(
    {
      code: 'invalid_response',
    }
  );
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
    { 'data.query': route },
    {
      'data.query'() {
        return { status: 200, body: envelope };
      },
    }
  );
  const client = createMessageClient({ 'data.query': route }, message =>
    router.dispatch(message, context())
  );
  expect(
    await client.request('data.query', { operation: 'count', input: 1 })
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
    { 'navigation.update': navigationUpdateRoute },
    {
      'navigation.update': createNavigationHandler({
        window: host,
        reservedSearchParams: ['workspace'],
      }),
    }
  );
  expect(
    await router.dispatch(
      {
        route: 'navigation.update',
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
        .dispatch({ route: 'navigation.update', payload }, context())
        .catch(error => error)
    ).toMatchObject({ code: 'invalid_payload' });
  expect(href).toBe(before);
});

test('routing checks cancellation before and after handlers', async () => {
  const controller = new AbortController();
  const router = createMessageRouter(routes, {
    double(value) {
      controller.abort();

      return value;
    },
  });
  expect(
    await router
      .dispatch({ route: 'double', payload: 1 }, { signal: controller.signal })
      .catch(error => error)
  ).toMatchObject({ name: 'AbortError' });
});

import {
  createMessageRouter,
  defineMessageRoute,
  defineDataQueryRoute,
  navigationUpdateRoute,
} from '@altertable/data-app/contract';
import { createMessageClient } from '@altertable/data-app/client';

const operations = {
  activity: {
    input(value: unknown) {
      return value as { days: number };
    },
    output(value: unknown) {
      return value as { events: number };
    },
  },
  label: {
    input(value: unknown) {
      return value as { id: string };
    },
    output(value: unknown) {
      return value as { label: string };
    },
  },
};
const routes = {
  'data:query': defineDataQueryRoute(operations),
  'navigation:update': navigationUpdateRoute,
  'test:echo': defineMessageRoute({
    input(value: unknown) {
      return value as string;
    },
    output(value: unknown) {
      return value as number;
    },
  }),
};

// Compile-only assertions: these functions are never called, including the deliberately invalid inputs.
async function verifyTypes() {
  const client = createMessageClient(routes, async () => null);
  const activity = await client.request('data:query', {
    operation: 'activity',
    input: { days: 7 },
  });
  const count: number = activity.body.data.events;
  // @ts-expect-error Activity does not return label data.
  const label: string = activity.body.data.label;
  const named = await client.request('data:query', {
    operation: 'label',
    input: { id: 'a' },
  });
  const title: string = named.body.data.label;
  // @ts-expect-error Unknown operation.
  await client.request('data:query', { operation: 'missing', input: {} });
  await client.request('data:query', {
    operation: 'activity',
    // @ts-expect-error The input must match the selected operation.
    input: { id: 'a' },
  });
  // @ts-expect-error Unknown route.
  await client.request('missing', null);
  await client.request('navigation:update', {
    search: '',
    hash: '',
    // @ts-expect-error Navigation mode must be push or replace.
    mode: 'reload',
  });
  const echoed: number = await client.request('test:echo', 'hello');
  // @ts-expect-error Echo expects a string payload.
  await client.request('test:echo', 7);
  createMessageRouter(routes, {
    'data:query'({ operation, input }) {
      if (operation === 'activity') {
        const days: number = input.days;
        void days;
      } else {
        const id: string = input.id;
        void id;
      }

      return { status: 200, body: {} };
    },
    'navigation:update'() {
      return null;
    },
    // @ts-expect-error Echo handlers must return a number.
    'test:echo'(payload) {
      return payload;
    },
  });

  return { count, label, title, echoed };
}

void verifyTypes;

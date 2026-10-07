import { useDeclaredResult, getViewDefinition } from '@/src/react/view-runtime';
import { useState } from 'react';
import { createDataClient } from '@/src/client/index';
import {
  defineOperation,
  parseCount,
  parseEmptyInput,
  type DimensionOption,
  type DimensionSelection,
} from '@/src/core/contract';
import { createDataHooks } from '@/src/react/hooks';
import type { TransportResponse } from '@/src/core/bridge';

const policy = { maxQueryRows: 10, maxDurationMs: 1000 };
const operations = {
  metric: defineOperation({
    input(value: unknown) {
      return value as { category: DimensionSelection<string> };
    },
    output: parseCount,
    checks: [{ category: { kind: 'all' } }],
    policy,
    async run() {
      return 1;
    },
  }),
  facet: defineOperation({
    input: parseEmptyInput,
    output(value: unknown) {
      return value as DimensionOption<string>[];
    },
    checks: [{}],
    policy,
    async run() {
      return [];
    },
  }),
};
const pending = new Map<string, (response: TransportResponse) => void>();

function createFixtureClient(id: string) {
  const calls = new Map<string, number>();

  return createDataClient<typeof operations>({
    transport(name, _, signal) {
      calls.set(name, (calls.get(name) ?? 0) + 1);
      document.body.setAttribute(
        `data-${id}-${name}-calls`,
        String(calls.get(name))
      );
      if (name === 'facet')
        return Promise.resolve(
          response([{ value: id, label: `${id.toUpperCase()} category` }])
        );

      return new Promise((resolve, reject) => {
        function abort() {
          pending.delete(id);
          document.body.setAttribute(`data-${id}-aborted`, 'true');
          reject(signal?.reason);
        }
        signal?.addEventListener('abort', abort, { once: true });
        pending.set(id, value => {
          signal?.removeEventListener('abort', abort);
          pending.delete(id);
          resolve(value);
        });
      });
    },
  });
}

function response(data: unknown): TransportResponse {
  return {
    status: 200,
    body: { data, requestId: 'fixture', queriedAt: 'now', queryIds: [] },
  };
}

const clientA = createFixtureClient('a');
const hooksA = createDataHooks(clientA);
const hooksAAgain = createDataHooks(clientA);
const hooksB = createDataHooks(createFixtureClient('b'));
const view = hooksA.defineDataView({
  operation: 'metric',
  variables: {
    category: hooksA.defineFacetFilter({
      key: 'category',
      label: 'Category',
      valueType: 'string',
      selection: 'single',
      facet: {
        operation: 'facet',
        input() {
          return {};
        },
      },
    }),
  },
  input({ category }) {
    return { category };
  },
  isEmpty() {
    return false;
  },
  emptyFallback: { title: 'No data' },
  describeInput() {
    return 'All categories';
  },
});

function Panel({ id, hooks }: { id: string; hooks: typeof hooksA }) {
  const result = useDeclaredResult(
    hooks.defineDataView(getViewDefinition(view))
  );

  return (
    <section data-testid={id}>
      <p data-testid="value">{result.snapshot?.data ?? 'pending'}</p>
      {result.controls}
      <button onClick={() => void result.cancel()}>Cancel</button>
    </section>
  );
}

export function ClientCacheApp() {
  const [swapped, setSwapped] = useState(false);

  return (
    <>
      <Panel id="a" hooks={swapped ? hooksB : hooksA} />
      <Panel id="a-again" hooks={hooksAAgain} />
      <Panel id="b" hooks={hooksB} />
      <button onClick={() => setSwapped(true)}>Switch A client</button>
      <button onClick={() => pending.get('a')?.(response(11))}>
        Resolve A
      </button>
      <button onClick={() => pending.get('b')?.(response(22))}>
        Resolve B
      </button>
    </>
  );
}

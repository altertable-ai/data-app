import { expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { createDataClient } from '@/src/client/index';
import { createIframeTransport } from '@/src/client/iframe';
import { BRIDGE, type BridgeMessage } from '@/src/core/bridge';
import {
  DataSourceError,
  defineOperation,
  defineQueryNames,
  rowsAsRecords,
} from '@/src/core/contract';
import { createHostedQueryHandler } from '@/src/server/hosted';
import type { QueryExecutorRequest } from '@/src/server/query-executor';

const heroNames = defineQueryNames({ heroes: 'hero-counts' });

function heroOperations(exposeSql = true) {
  return {
    heroes: defineOperation({
      input(value: unknown) {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error('Choose an input.');

        return value as { tier?: string };
      },
      output(value: unknown) {
        return value as { label: string; value: number }[];
      },
      checks: [{}],
      queryNames: heroNames,
      policy: { maxQueryRows: 10, maxDurationMs: 1_000, exposeSql },
      async run({ query }, input) {
        const result = await query(
          heroNames.heroes,
          `select label, value from heroes where tier = '${input.tier ?? 'all'}'`,
          { limit: 2 }
        );

        return rowsAsRecords(result, ['label', 'value']).map(row => ({
          label: String(row.label),
          value: Number(row.value),
        }));
      },
    }),
  };
}

test('the browser client does not execute hosted SQL', async () => {
  const root = resolve(import.meta.dir, '../src/client');
  for await (const name of new Bun.Glob('**/*.{ts,tsx}').scan(root)) {
    const text = await Bun.file(resolve(root, name)).text();
    expect(text, name).not.toContain('query:execute');
    expect(text, name).not.toContain('executeHostedOperation');
  }
});

test('data:query returns rows from the host SQL executor with the operation limit', async () => {
  const calls: QueryExecutorRequest[] = [];
  const routes: string[] = [];
  const handle = createHostedQueryHandler(heroOperations(), {
    canDiscloseSql: true,
    async execute(request) {
      calls.push(request);

      return {
        columns: [{ name: 'label' }, { name: 'value', type: 'BIGINT' }],
        rows: [['Mutant', 377]],
        queryId: 'q1',
      };
    },
  });
  const sent: BridgeMessage[] = [];
  const frame = new EventTarget() as Window;
  const origin = 'https://host.example';
  const parent = {
    postMessage(message: BridgeMessage) {
      sent.push(message);
      if (message.type === 'bridge:ready') {
        queueMicrotask(() =>
          deliver({ type: 'bridge:initialize', sessionId: 'hosted' })
        );
      }
      if (message.type !== 'bridge:request') return;
      routes.push(message.route ?? '');
      queueMicrotask(async () => {
        const response = await handle(
          message.payload as { operation: string; input: unknown },
          AbortSignal.timeout(1_000)
        );
        deliver({ type: 'bridge:result', id: message.id, response });
      });
    },
  };

  function deliver(message: Partial<BridgeMessage>) {
    frame.dispatchEvent(
      Object.assign(new Event('message'), {
        source: parent,
        origin,
        data: {
          channel: BRIDGE,
          version: 1,
          documentId: sent[0]?.documentId,
          sessionId: 'hosted',
          ...message,
        },
      })
    );
  }

  Object.assign(frame, { parent });
  const bridge = createIframeTransport({
    parentOrigin: origin,
    window: frame,
  });
  const client = createDataClient<ReturnType<typeof heroOperations>>({
    transport: bridge.transport,
  });
  try {
    const result = await client.query('heroes', { tier: 'top' });
    expect(routes).toEqual(['data:query']);
    expect(calls).toEqual([
      {
        sql: "select label, value from heroes where tier = 'top'",
        limit: 2,
      },
    ]);
    expect(JSON.stringify(sent)).not.toContain('query:execute');
    expect(result.data).toEqual([{ label: 'Mutant', value: 377 }]);
    expect(result.input).toEqual({ tier: 'top' });
    expect(result.queryIds).toEqual(['q1']);
    expect(result.queries).toEqual([
      {
        name: 'hero-counts',
        statement: "select label, value from heroes where tier = 'top'",
        queryId: 'q1',
      },
    ]);
    const hidden = await createHostedQueryHandler(heroOperations(), {
      async execute() {
        return {
          columns: ['label', 'value'],
          rows: [['Human', 83]],
          queryId: 'q2',
        };
      },
    })({ operation: 'heroes', input: {} }, AbortSignal.timeout(1_000));
    expect(hidden.status).toBe(200);
    expect(hidden.body).toMatchObject({
      data: [{ label: 'Human', value: 83 }],
      queryIds: ['q2'],
    });
    expect(hidden.body).not.toHaveProperty('queries');
  } finally {
    bridge.dispose();
  }
});

test('the host executor preserves source error codes and the row limit', async () => {
  const calls: QueryExecutorRequest[] = [];
  const names = defineQueryNames({ blank: 'blank-query' });
  const operations = {
    ...heroOperations(false),
    blank: defineOperation({
      input(value: unknown) {
        return value;
      },
      output(value: unknown) {
        return value as true;
      },
      checks: [{}],
      queryNames: names,
      policy: { maxQueryRows: 1, maxDurationMs: 1_000 },
      async run({ query }) {
        await query(names.blank, '   ');

        return true;
      },
    }),
  };
  const handle = createHostedQueryHandler(operations, {
    async execute(request) {
      calls.push(request);
      if (request.sql.includes('forbidden'))
        throw new DataSourceError('forbidden');
      if (request.sql.includes('busy')) return { reason: 'rate_limited' };
      if (request.sql.includes('broken'))
        return { errors: [{ message: 'Catalog not found' }] };
      if (request.sql.includes('wide'))
        return {
          columns: ['label'],
          rows: [['A'], ['B'], ['C']],
        };

      return { columns: ['label'], rows: [{ label: 'nope' }] };
    },
  });
  const signal = AbortSignal.timeout(1_000);
  const forbidden = await handle(
    {
      operation: 'heroes',
      input: { tier: 'forbidden' },
    },
    signal
  );
  expect(forbidden).toMatchObject({
    status: 502,
    body: {
      error: {
        code: 'source_forbidden',
        message: expect.stringContaining('cannot access its lakehouse'),
      },
    },
  });
  const busy = await handle(
    { operation: 'heroes', input: { tier: 'busy' } },
    signal
  );
  expect(busy).toMatchObject({
    status: 429,
    body: { error: { code: 'source_rate_limited' } },
  });
  const rejected = await handle(
    { operation: 'heroes', input: { tier: 'broken' } },
    signal
  );
  expect(rejected).toMatchObject({
    status: 502,
    body: { error: { code: 'source_query_rejected' } },
  });
  expect(JSON.stringify(rejected.body)).not.toContain('Catalog not found');
  const wide = await handle(
    { operation: 'heroes', input: { tier: 'wide' } },
    signal
  );
  expect(wide).toMatchObject({
    status: 502,
    body: { error: { code: 'query_failed' } },
  });
  expect(calls.every(call => call.limit === 2)).toBe(true);
  expect(calls.every(call => Object.keys(call).join() === 'sql,limit')).toBe(
    true
  );
  const callsBeforeBlank = calls.length;
  const blank = await handle({ operation: 'blank', input: {} }, signal);
  expect(calls).toHaveLength(callsBeforeBlank);
  expect(blank).toMatchObject({
    status: 502,
    body: { error: { code: 'source_query_rejected' } },
  });
  const invalid = await handle({ operation: 'heroes', input: 'nope' }, signal);
  expect(invalid).toMatchObject({
    status: 400,
    body: { error: { code: 'invalid_input' } },
  });
  const shaped = await handle(
    { operation: 'heroes', input: { tier: 'shaped' } },
    signal
  );
  expect(shaped).toMatchObject({
    status: 502,
    body: { error: { code: 'query_failed' } },
  });
});

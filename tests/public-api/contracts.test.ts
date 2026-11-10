import { createDataHooks, createDataContext } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  choiceFilter,
  dateTimeRangeFilter,
  defineOperation,
  dimensionFilter,
  searchFilter,
  dimensionPredicate,
  parseCount,
  type DateTimeRangeInput,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';
import { expect, test } from 'vitest';

test('an operation reading a date range and dimension validates and escapes its input', async () => {
  const region = dimensionFilter<string>({
    key: 'region',
    label: 'Region',
    valueType: 'string',
    selectionMode: 'multiple',
    allowMissing: true,
    options: [
      { value: "O'Brien", label: 'Named region' },
      { value: 'null', label: 'Literal null' },
    ],
  });
  const period = dateTimeRangeFilter({
    key: 'period',
    minDate: '2026-02-27',
    maxDate: '2026-03-31',
    maxRangeDays: 7,
    comparison: 'off',
    defaultValue: {
      from: new Date('2026-03-04T00:00:00Z'),
      to: new Date('2026-03-07T00:00:00Z'),
    },
  });
  const input: {
    period: DateTimeRangeInput;
    region: DimensionSelection<string>;
  } = {
    period: period.request({
      range: period.defaultValue.range,
      comparison: 'previous',
    }),
    region: {
      kind: 'include' as const,
      members: [
        { kind: 'value' as const, value: "O'Brien" },
        { kind: 'missing' as const },
      ],
    },
  };
  expect(dimensionPredicate('region', input.region, ['region'])).toBe(
    "(region IN ('O''Brien') OR region IS NULL)"
  );
  const statements: string[] = [];
  const operations = {
    activity: defineOperation({
      filters: { period, region },
      queries: {
        activity: {
          projections: { count: { type: 'number' } } as const,
          statement:
            'SELECT count FROM activity WHERE region = $region OR region IS NULL',
          params: {
            region: { type: 'string', nullable: true },
          },
        },
      },
      policy: { maxQueryRows: 1, maxDurationMs: 1000 },
      async run({ query }, selected) {
        const result = await query('activity', {
          region:
            selected.region.kind === 'include' &&
            selected.region.members[0]?.kind === 'value'
              ? selected.region.members[0].value
              : null,
        });
        return parseCount(result.rows[0]!.count);
      },
    }),
  };
  const client = createDataClient({
    operations,
    lakehouse: {
      async queryAll(statement) {
        statements.push(statement);
        return { columns: [{ name: 'count' }], rows: [[0]] };
      },
    },
  });
  const response = await client.query('activity', input);
  expect(response.data).toBe(0);
  expect(response.input.period.comparison).toEqual({
    from: new Date('2026-03-01T00:00:00Z'),
    to: new Date('2026-03-04T00:00:00Z'),
  });
  expect(statements).toEqual([
    'SELECT count FROM activity WHERE region = $region OR region IS NULL',
  ]);
  expect(
    region.read(
      new URLSearchParams(region.write(input.region) as Record<string, string>)
    )
  ).toEqual(input.region);
  for (const period of [
    {
      ...input.period,
      range: {
        from: new Date('2026-02-01T00:00:00Z'),
        to: new Date('2026-03-07T00:00:00Z'),
      },
    },
    {
      ...input.period,
      range: {
        from: new Date('2026-03-01T00:00:00Z'),
        to: new Date('2026-03-10T00:00:00Z'),
      },
    },
    {
      ...input.period,
      comparison: {
        from: new Date('2026-03-02T00:00:00Z'),
        to: new Date('2026-03-04T00:00:00Z'),
      },
    },
  ])
    await expect(
      client.query('activity', { ...input, period })
    ).rejects.toMatchObject({ code: 'invalid_input' });
  await expect(
    client.query('activity', {
      ...input,
      region: {
        kind: 'include',
        members: [{ kind: 'value', value: 'unknown' }],
      },
    })
  ).rejects.toMatchObject({ code: 'invalid_input' });
  expect(statements).toHaveLength(1);
});

test('authoring a view rejects invalid datasets and unregistered evidence', () => {
  const context = createDataContext({ rows: 'rows' })({
    description: 'Rows',
    glossary: {
      count: {
        term: 'Count',
        definition: 'Measured rows',
        queryNames: ['rows'],
      },
    },
  });
  const hooks = createDataHooks(
    createDataClient({
      operations: {
        rows: defineOperation({
          queries: {},
          filters: { group: searchFilter({ key: 'group' }) },
          policy: { maxQueryRows: 1, maxDurationMs: 1000 },
          async run() {
            return 1;
          },
        }),
      },
      lakehouse: {
        async queryAll() {
          return { columns: [], rows: [] };
        },
      },
    })
  );
  const view = hooks.defineView({
    dataContext: context,
    operation: 'rows',
    describeInput: input => input.group,
  });
  expect(() =>
    view.dataset({
      name: 'Rows',
      select: (count: number) => [count],
      rowKey: row => row,
      columns: { count: { value: row => row } },
      evidence: { id: 'rows', queryNames: ['unknown' as 'rows'] },
    })
  ).toThrow('Unknown query');
  expect(() =>
    view.dataset({
      name: 'Rows',
      select: (count: number) => [count],
      rowKey: row => row,
      // @ts-expect-error Untyped callers must still be rejected at runtime.
      columns: {},
      evidence: { id: 'rows', queryNames: ['rows'] },
    })
  ).toThrow();
});

function groupFilter() {
  return choiceFilter({
    key: 'group',
    label: 'Group',
    defaultValue: 'all',
    options: [
      { id: 'all', label: 'All groups' },
      { id: 'alpha', label: 'Alpha' },
    ],
  });
}

const policy = { maxQueryRows: 1, maxDurationMs: 1000 };

test('an operation derives its parser and checks from the filters it reads', async () => {
  const period = dateTimeRangeFilter({
    key: 'period',
    minDate: '2026-03-01',
    maxDate: '2026-03-31',
    maxRangeDays: 7,
    defaultValue: {
      from: new Date('2026-03-04T00:00:00Z'),
      to: new Date('2026-03-07T00:00:00Z'),
    },
  });
  const group = groupFilter();
  const received: unknown[] = [];
  const operations = {
    counts: defineOperation({
      queries: {},
      filters: { period, group },
      policy,
      async run(_, input) {
        received.push(input);
        return 1;
      },
    }),
    total: defineOperation({
      queries: {},
      policy,
      async run() {
        return 2;
      },
    }),
  };
  const defaults = {
    period: {
      range: {
        from: new Date('2026-03-04T00:00:00Z'),
        to: new Date('2026-03-07T00:00:00Z'),
      },
      comparison: null,
    },
    group: 'all',
  };
  expect(operations.counts.checks).toEqual([defaults]);
  expect(operations.total.checks).toEqual([{}]);
  const client = createDataClient({
    operations,
    lakehouse: {
      async queryAll() {
        return { columns: [], rows: [] };
      },
    },
  });
  expect(client.filters).toMatchObject({ counts: { period, group } });
  await expect(
    client.query('counts', { ...defaults, group: 'alpha' })
  ).resolves.toMatchObject({ data: 1 });
  expect(received).toEqual([{ ...defaults, group: 'alpha' }]);
  expect(await client.query('total', {})).toMatchObject({ data: 2 });
  const parse = operations.counts.input;
  expect(() => parse({ ...defaults, extra: 1 })).toThrow(
    'Unknown filter input: extra.'
  );
  expect(() => parse({ period: defaults.period })).toThrow('Invalid Group.');
  expect(() => parse({ ...defaults, group: 'beta' })).toThrow('Invalid Group.');
  expect(() =>
    parse({
      ...defaults,
      period: {
        range: {
          from: new Date('2026-03-01T00:00:00Z'),
          to: new Date('2026-03-20T00:00:00Z'),
        },
        comparison: null,
      },
    })
  ).toThrow('at most 7');
  expect(() => operations.total.input({ group: 'all' })).toThrow(
    'Unknown filter input: group.'
  );
  for (const invalid of [
    { ...defaults, extra: 1 },
    { period: defaults.period },
    { ...defaults, group: 'beta' },
  ])
    await expect(
      // @ts-expect-error Untyped callers must still be rejected at runtime.
      client.query('counts', invalid)
    ).rejects.toMatchObject({ code: 'invalid_input' });
  expect(received).toHaveLength(1);
});

test('operation declarations reject a second date filter and a parser beside filters', () => {
  const filters = {
    period: dateTimeRangeFilter({ key: 'period', defaultValue: '7d' }),
    baseline: dateTimeRangeFilter({ key: 'baseline', defaultValue: '7d' }),
  };
  expect(() =>
    defineOperation({
      queries: {},
      // @ts-expect-error An operation reads at most one date filter.
      filters,
      policy,
      async run() {
        return 1;
      },
    })
  ).toThrow('An operation reads at most one date filter.');
  // The filter parses its own field; the operation's parser cannot claim it too.
  expect(() =>
    defineOperation({
      queries: {},
      filters: { group: groupFilter() },
      input: (value: unknown) => ({ group: String(value) }),
      checks: [{ group: 'all' }],
      policy,
      async run() {
        return 1;
      },
    })
  ).toThrow('Input field group is also a filter; the filter parses it.');
});

test('a destination reads the displayed filters beside its own record key', async () => {
  const group = groupFilter();
  const records = defineOperation({
    queries: {},
    filters: { group },
    input(value: unknown) {
      const { recordId } = value as { recordId?: unknown };
      if (typeof recordId !== 'string') throw new Error('Expected a record.');
      return { recordId };
    },
    checks: [{ recordId: 'r1' }],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run(_context, input) {
      return `${input.group}:${input.recordId}`;
    },
  });
  expect(records.checks).toEqual([{ group: 'all', recordId: 'r1' }]);
  const client = createDataClient({
    operations: { records },
    lakehouse: {
      async queryAll() {
        return { columns: [], rows: [] };
      },
    },
  });
  expect(client.filters).toEqual({ records: { group } });
  await expect(
    client.query('records', { group: 'alpha', recordId: 'r2' })
  ).resolves.toMatchObject({ data: 'alpha:r2' });
  for (const invalid of [
    { group: 'missing', recordId: 'r2' },
    { group: 'alpha' },
  ])
    await expect(
      client.query('records', invalid as never)
    ).rejects.toMatchObject({ code: 'invalid_input' });
});

test('operations sharing a client share one declaration per filter name', () => {
  const group = groupFilter();
  const lakehouse = {
    async queryAll() {
      return { columns: [], rows: [] };
    },
  };
  function reading(filters: { group: typeof group }) {
    return defineOperation({
      queries: {},
      filters,
      policy,
      async run() {
        return 1;
      },
    });
  }
  expect(
    createDataClient({
      operations: { first: reading({ group }), second: reading({ group }) },
      lakehouse,
    }).filters
  ).toEqual({ first: { group }, second: { group } });
  expect(() =>
    createDataClient({
      operations: {
        first: reading({ group }),
        second: reading({ group: groupFilter() }),
      },
      lakehouse,
    })
  ).toThrow(
    'Operations read different filters named group; declare it once and share it (second).'
  );
});

test('HTTP clients receive the filters their server operations read', async () => {
  const group = groupFilter();
  const operations = {
    counts: defineOperation({
      queries: {},
      filters: { group },
      policy,
      async run(_, input) {
        return input.group === 'alpha' ? 1 : 0;
      },
    }),
  };
  const handler = createDataHandler(operations, async () => ({
    lakehouse: {
      async queryAll() {
        return { columns: [], rows: [] };
      },
    },
  }));
  const client = createDataClient<typeof operations>({
    filters: { counts: operations.counts.filters },
    endpoint: 'http://localhost/api/data',
    fetch: Object.assign(
      async (url: RequestInfo | URL, options?: RequestInit) =>
        handler(new Request(url, options)),
      { preconnect() {} }
    ),
  });
  expect(client.filters).toEqual({ counts: { group } });
  expect(await client.query('counts', { group: 'alpha' })).toMatchObject({
    data: 1,
    input: { group: 'alpha' },
  });
  await expect(
    // @ts-expect-error The server rejects selections outside the declared options.
    client.query('counts', { group: 'beta' })
  ).rejects.toMatchObject({ code: 'invalid_input' });
});

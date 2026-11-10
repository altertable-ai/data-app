import { createDataHooks, createDataContext } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  choiceFilter,
  dateRangeFilter,
  defineOperation,
  defineDateRangeContract,
  dimensionFilter,
  searchFilter,
  dimensionPredicate,
  parseCount,
  type DateRangeRequest,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';
import { expect, test } from 'vitest';

test('an operation reading a date range and dimension validates and escapes its input', async () => {
  const calendar = defineDateRangeContract({
    minDate: '2026-02-27',
    maxDate: '2026-03-31',
    maxRangeDays: 7,
    timeZone: 'UTC',
  });
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
  const period = dateRangeFilter({
    key: 'period',
    contract: calendar,
    comparison: true,
    defaultValue: { kind: 'dates', start: '2026-03-04', end: '2026-03-06' },
  });
  const input: {
    period: DateRangeRequest;
    region: DimensionSelection<string>;
  } = {
    period: calendar.request({ start: '2026-03-04', end: '2026-03-06' }, true),
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
    start: '2026-03-01',
    end: '2026-03-03',
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
    { range: { start: '2026-02-30', end: '2026-03-02' }, comparison: null },
    { range: { start: '2026-03-01', end: '2026-03-09' }, comparison: null },
    {
      range: input.period.range,
      comparison: { start: '2026-03-02', end: '2026-03-03' },
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
  const calendar = defineDateRangeContract({
    minDate: '2026-03-01',
    maxDate: '2026-03-31',
    maxRangeDays: 7,
    timeZone: 'UTC',
  });
  const period = dateRangeFilter({
    key: 'period',
    contract: calendar,
    defaultValue: { kind: 'dates', start: '2026-03-04', end: '2026-03-06' },
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
    period: calendar.request({ start: '2026-03-04', end: '2026-03-06' }, false),
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
      period: { range: { start: '2026-03-01', end: '2026-03-09' } },
    })
  ).toThrow();
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
  const contract = defineDateRangeContract({
    maxRangeDays: 7,
    timeZone: 'UTC',
  });
  const filters = {
    period: dateRangeFilter({
      key: 'period',
      contract,
      defaultValue: { kind: 'preset', id: 'last-7' },
    }),
    baseline: dateRangeFilter({
      key: 'baseline',
      contract,
      defaultValue: { kind: 'preset', id: 'last-7' },
    }),
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
  // JavaScript callers can declare both input contracts.
  const both = {
    queries: {},
    filters: { group: groupFilter() },
    input: (value: unknown) => value,
    checks: [{ group: 'all' }],
    policy,
    async run() {
      return 1;
    },
  };
  expect(() => defineOperation(both as never)).toThrow(
    'An operation reads filters or parses its own input, not both.'
  );
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

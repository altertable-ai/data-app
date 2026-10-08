import { expect, test } from 'vitest';
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  createDataContext,
  textVariable,
} from '@altertable/data-app/react';
import {
  defineOperation,
  defineDateRangeContract,
  dimensionFilter,
  parseDimensionSelection,
  parseCount,
  type DateRangeRequest,
  type DimensionSelection,
} from '@altertable/data-app/contract';

test('a calendar and dimension declaration validates and escapes the input used by an operation', async () => {
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
    selection: 'multiple',
    allowMissing: true,
    options: [
      { value: "O'Brien", label: 'Named region' },
      { value: 'null', label: 'Literal null' },
    ],
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
  const requests: unknown[] = [];
  const operations = {
    activity: defineOperation({
      input(value: unknown) {
        const request = value as typeof input;
        return {
          period: calendar.parseRequest(request.period),
          region: parseDimensionSelection(request.region, region),
        };
      },
      output: parseCount,
      checks: [input],
      queryNames: { activity: 'activity' },
      policy: { maxQueryRows: 1, maxDurationMs: 1000, exposeSql: true },
      async run({ query }, selected) {
        const members =
          selected.region.kind === 'all' ? [] : selected.region.members;
        const result = await query('activity', {
          all: selected.region.kind === 'all',
          regions: JSON.stringify(
            members.flatMap(member =>
              member.kind === 'value' ? [member.value] : []
            )
          ),
          missing: members.some(member => member.kind === 'missing'),
        });
        return parseCount(result.rows[0]![0]);
      },
    }),
  };
  const client = createDataClient({
    operations,
    lakehouse: {
      async queryById(name, values) {
        requests.push({ name, values });
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
  expect(requests).toEqual([
    {
      name: 'activity',
      values: { all: false, regions: '["O\'Brien"]', missing: true },
    },
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
  expect(requests).toHaveLength(1);
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
          input: value => value as { group: string },
          output: parseCount,
          checks: [{ group: '' }],
          policy: { maxQueryRows: 1, maxDurationMs: 1000, exposeSql: false },
          async run() {
            return 1;
          },
        }),
      },
      lakehouse: {
        async queryById() {
          return { columns: [], rows: [] };
        },
      },
    })
  );
  const view = hooks.defineDataView({
    dataContext: context,
    operation: 'rows',
    variables: { group: textVariable({ key: 'group' }) },
    describeInput: input => input.group,
    isEmpty: () => false,
    emptyFallback: { title: 'Empty' },
  });
  expect(() =>
    view.dataset({
      name: 'Rows',
      select: count => [count],
      rowKey: row => row,
      columns: { count: { value: row => row } },
      evidence: { id: 'rows', queryNames: ['unknown' as 'rows'] },
    })
  ).toThrow('Unknown query');
  expect(() =>
    view.dataset({
      name: 'Rows',
      select: count => [count],
      rowKey: row => row,
      columns: {},
      evidence: { id: 'rows', queryNames: ['rows'] },
    })
  ).toThrow();
});

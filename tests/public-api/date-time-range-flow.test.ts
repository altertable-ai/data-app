import { defineDataApp } from '@altertable/data-app';
import { extractDataAppManifest } from '@altertable/data-app-manifest';
import { createDataClient } from '@altertable/data-app/client';
import {
  dateTimeRangeFilter,
  parseDateTimeRange,
  parseDateTimeBound,
  formatDateTimeBound,
  serializeDateTimeRange,
  dateTimeRangeSql,
  resolveDateTimeRange,
  type DateTimeRange,
} from '@altertable/data-app/contract';
import { createDataHandler } from '@altertable/data-app/server';
import { expect, expectTypeOf, test, vi } from 'vitest';

const relative: DateTimeRange = {
  from: {
    anchor: 'RELATIVE_ANCHOR_NOW',
    offset: [{ amount: -7, unit: 'DAY' }],
  },
  to: null,
};

test('datetime variables preserve relative intent and restore absolute values across URLs and JSON', () => {
  const period = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '7d',
    maxRangeDays: 90,
  });
  expect(period.defaultValue).toEqual({ range: relative });
  expect(period.read(new URLSearchParams())).toEqual({ range: relative });
  const mixed: DateTimeRange = {
    from: new Date('2026-01-01T16:00:00Z'),
    to: { anchor: 'RELATIVE_ANCHOR_START_OF_MONTH', offset: [] },
  };
  const unlimited = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '7d',
  });
  const written = unlimited.write({ range: mixed });
  const restored = unlimited.read(
    new URLSearchParams({ period: written.period! })
  );
  expect(restored.range.from).toBeInstanceOf(Date);
  expect(restored).toEqual({ range: mixed });
  expect(unlimited.same(restored, { range: mixed })).toBe(true);
  expect(period.read(new URLSearchParams({ period: '{broken' }))).toEqual({
    range: relative,
  });
  expect(
    period.valid({
      range: {
        from: new Date('2020-01-01T00:00:00Z'),
        to: new Date('2026-01-01T00:00:00Z'),
      },
    })
  ).toBe(false);
  expect(serializeDateTimeRange(relative)).toBe(JSON.stringify(relative));
});

test('an operation receives a resolved date range that a registered query binds without app conversion', async () => {
  const period = dateTimeRangeFilter({ key: 'period', defaultValue: '7d' });
  const app = defineDataApp({
    title: 'Datetime',
    description: 'Datetime query',
    scope: { organization: 'test', environment: 'test' },
    queries: {
      events: {
        statement: 'SELECT $period.from AS start, $period.to AS end',
        params: { period: { type: 'dateTimeRange' } },
        projections: { start: { type: 'string' }, end: { type: 'string' } },
      },
    },
  });
  const operation = app.defineOperation({
    filters: { period },
    policy: { maxQueryRows: 10, maxDurationMs: 1000 },
    async run({ query }, { period }) {
      return (await query('events', { period: period.range })).rows;
    },
  });
  let sent: { statement: string; params: unknown } | undefined;
  const client = createDataClient({
    operations: { events: operation },
    lakehouse: {
      async queryAll(statement, options) {
        sent = { statement, params: options.params };
        return {
          columns: [{ name: 'start' }, { name: 'end' }],
          rows: [['start', 'end']],
        };
      },
    },
  });
  const result = await client.query('events', {
    period: period.request({ range: relative }),
  });
  expect(result.data).toEqual([{ start: 'start', end: 'end' }]);
  expect(sent?.statement).not.toContain('$period.from');
  const bound = JSON.parse((sent!.params as { period: string }).period);
  expect(new Date(bound.to).getTime() - new Date(bound.from).getTime()).toBe(
    7 * 86_400_000
  );
  const { input } = operation;
  const absolute = {
    period: {
      range: {
        from: '2026-01-01T16:00:00.000Z',
        to: '2026-01-02T16:00:00.000Z',
      },
      comparison: null,
    },
  };
  expect(input(absolute).period.range.from).toBeInstanceOf(Date);
  expect(() =>
    input({
      period: {
        range: { from: { anchor: 'DROP TABLE events', offset: [] } },
        comparison: null,
      },
    })
  ).toThrow();
});

test('query expansion leaves literals, comments, quoted identifiers, and other parameters intact', () => {
  const statement = `SELECT '$period.from' AS "a$period.to", $$ $period.from $$ AS literal, $period.from AS bound, $count AS count -- $period.to\n/* outer /* $period.from */ comment */`;
  const app = defineDataApp({
    title: 'Quoted',
    description: 'Quoted SQL',
    scope: { organization: 'test', environment: 'test' },
    queries: {
      events: {
        statement,
        params: {
          period: { type: 'dateTimeRange' },
          count: { type: 'number' },
        },
        projections: { bound: { type: 'string' } },
      },
    },
  });
  expect(app.queries.events.statement).toContain("'$period.from'");
  expect(app.queries.events.statement).toContain('$$ $period.from $$');
  expect(app.queries.events.statement).toContain(
    '/* outer /* $period.from */ comment */'
  );
  expect(app.queries.events.statement).toContain('$count AS count');
  expect(app.queries.events.statement).not.toContain('$period.from AS bound');
});

test('SQL helpers produce parameterized bounds and reject unsafe structured values', () => {
  const compiled = dateTimeRangeSql(relative);
  expect(JSON.parse(compiled.params.period!)).toEqual(relative);
  expect(compiled.from).toContain("INTERVAL '1 DAY'");
  expect(compiled.to).toContain('localtimestamp');
  expect(() =>
    dateTimeRangeSql(relative, 'period); DROP TABLE events')
  ).toThrow();
  for (const invalid of [
    { from: new Date(NaN) },
    { from: '2026-01-01' },
    {
      from: {
        anchor: 'RELATIVE_ANCHOR_NOW',
        offset: [{ amount: 1, unit: 'DAY); SELECT 1' }],
      },
    },
    {
      from: {
        anchor: 'RELATIVE_ANCHOR_NOW',
        offset: [{ amount: NaN, unit: 'DAY' }],
      },
    },
    {
      from: {
        anchor: 'RELATIVE_ANCHOR_NOW',
        offset: Array(17).fill({ amount: -1, unit: 'DAY' }),
      },
    },
  ])
    expect(() => parseDateTimeRange(invalid)).toThrow();
});

test('preview uses UTC calendar arithmetic and preserves ordered month offsets', () => {
  const result = resolveDateTimeRange(
    {
      from: {
        anchor: 'RELATIVE_ANCHOR_NOW',
        offset: [
          { amount: 1, unit: 'MONTH' },
          { amount: 1, unit: 'MONTH' },
        ],
      },
      to: new Date('2024-04-01T00:00:00Z'),
    },
    new Date('2024-01-31T16:00:00Z')
  );
  expect(result.from?.toISOString()).toBe('2024-03-29T16:00:00.000Z');
});

test('editable relative bounds round-trip anchors and ordered offsets', () => {
  const bound = {
    anchor: 'RELATIVE_ANCHOR_START_OF_MONTH',
    offset: [
      { amount: -1, unit: 'MONTH' },
      { amount: 2, unit: 'DAY' },
    ],
  } as const;
  const parsed = parseDateTimeBound('Start of month − 1mo + 2d');
  expect(parsed).toEqual(bound);
  expect(parseDateTimeBound(formatDateTimeBound(parsed))).toEqual(bound);
  expect(parseDateTimeBound('now')).toEqual({
    anchor: 'RELATIVE_ANCHOR_NOW',
    offset: [],
  });
  expect(() => parseDateTimeBound('')).toThrow();
});

test('absolute query defaults remain dates, are snapshotted, and bind without caller conversion', async () => {
  const from = new Date('2026-01-01T16:00:00Z');
  const app = defineDataApp({
    title: 'Defaults',
    description: 'Absolute datetime defaults',
    scope: { organization: 'test', environment: 'test' },
    queries: {
      events: {
        statement: String.raw`SELECT E'escaped\' $period.from' AS text, $period.from AS start`,
        params: {
          period: {
            type: 'dateTimeRange',
            defaultValue: { from, to: new Date('2026-01-02T16:00:00Z') },
          },
        },
        projections: { start: { type: 'string' } },
      },
    },
  });
  from.setUTCFullYear(2000);
  expect(app.queries.events.params.period.defaultValue.from).toBeInstanceOf(
    Date
  );
  expect(app.queries.events.statement).toContain(
    String.raw`E'escaped\' $period.from'`
  );
  const operation = app.defineOperation({
    input: () => ({}),
    checks: [{}],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run({ query }) {
      return (await query('events')).rows;
    },
  });
  const client = createDataClient({
    operations: { events: operation },
    lakehouse: {
      async queryAll(_statement, { params }) {
        expect(JSON.parse(String(params?.period)).from).toBe(
          '2026-01-01T16:00:00.000Z'
        );
        return { columns: [{ name: 'start' }], rows: [['2026-01-01 16:00']] };
      },
    },
  });
  expect((await client.query('events', {})).data).toEqual([
    { start: '2026-01-01 16:00' },
  ]);
});

test('literal ISO query defaults survive manifest extraction and hydrate before query execution', async () => {
  const declaration = {
    title: 'Defaults',
    description: 'Literal datetime defaults',
    scope: { organization: 'test', environment: 'test' },
    queries: {
      events: {
        statement: 'SELECT $period.from AS start, $period.to AS end',
        params: {
          period: {
            type: 'dateTimeRange' as const,
            defaultValue: {
              from: '2026-01-01T16:00:00.000Z',
              to: {
                anchor: 'RELATIVE_ANCHOR_START_OF_YEAR' as const,
                offset: [],
              },
            },
          },
        },
        projections: { start: { type: 'string' as const } },
      },
    },
  };
  const manifest = extractDataAppManifest(
    `import { defineDataApp } from '@altertable/data-app';
export const dataApp = defineDataApp(${JSON.stringify(declaration)});`
  );
  expect(manifest.diagnostics).toEqual([]);
  expect(manifest.manifest).not.toBeNull();
  const dataApp = defineDataApp(declaration);
  const defaults = dataApp.queries.events.params.period.defaultValue;
  expectTypeOf(defaults).toEqualTypeOf<DateTimeRange>();
  expect(defaults.from).toEqual(new Date('2026-01-01T16:00:00.000Z'));
  expect(defaults.to).toEqual(
    declaration.queries.events.params.period.defaultValue.to
  );
  declaration.queries.events.params.period.defaultValue.from =
    '2000-01-01T00:00:00.000Z';
  const operation = dataApp.defineOperation({
    input: () => ({}),
    checks: [{}],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run({ query }) {
      return (await query('events')).rows;
    },
  });
  const client = createDataClient({
    operations: { events: operation },
    lakehouse: {
      async queryAll(_statement, { params }) {
        expect(JSON.parse(String(params?.period))).toEqual({
          from: '2026-01-01T16:00:00.000Z',
          to: { anchor: 'RELATIVE_ANCHOR_START_OF_YEAR', offset: [] },
        });
        return { columns: [{ name: 'start' }], rows: [['2026-01-01 16:00']] };
      },
    },
  });
  expect((await client.query('events', {})).data).toEqual([
    { start: '2026-01-01 16:00' },
  ]);
});

test('mixed ranges validate in the reporting zone and survive URL restoration', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-02T14:30:00.000Z')); // 16:30 in Paris.
  try {
    const period = dateTimeRangeFilter({
      key: 'period',
      defaultValue: '1d',
      maxRangeDays: 3,
      timeZone: 'Europe/Paris',
    });
    const range = { from: new Date('2026-07-02T16:00:00.000Z'), to: null };
    expect(period.valid({ range })).toBe(true);
    expect(
      period.read(
        new URLSearchParams({ period: serializeDateTimeRange(range) })
      )
    ).toEqual({ range });
    expect(
      period.valid({
        range: {
          from: new Date('2026-07-02T16:00:00Z'),
          to: new Date('2026-07-01T16:00:00Z'),
        },
      })
    ).toBe(false);
    expect(period.valid({ range: relative })).toBe(false);
    expect(
      period.valid({
        range: {
          from: new Date('2026-07-01T16:00:00Z'),
          to: new Date('2026-07-05T16:00:00Z'),
        },
      })
    ).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

test('HTTP host datetime parameters decode validated JSON and remain protected from caller overrides', async () => {
  const dataApp = defineDataApp({
    title: 'Host range',
    description: 'Protected range',
    scope: { organization: 'test', environment: 'test' },
    queries: {
      events: {
        statement: 'SELECT $period.from AS start',
        params: { period: { type: 'dateTimeRange' } },
        projections: { start: { type: 'string' } },
      },
    },
  });
  const operation = dataApp.defineOperation({
    input: (value: unknown) => ({ override: value === true }),
    checks: [{ override: false }],
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run({ query }, input) {
      return input.override
        ? (await query('events', { period: relative })).rows
        : (await query('events')).rows;
    },
  });
  let sqlCalls = 0;
  let hostValue = serializeDateTimeRange({
    from: new Date('2026-07-02T16:00:00.000Z'),
    to: relative.from,
  });
  const handle = createDataHandler({ events: operation }, async () => ({
    queryParams: { period: hostValue },
    lakehouse: {
      async queryAll(_statement, { params }) {
        sqlCalls++;
        expect(params?.period).toBe(hostValue);
        return { columns: [{ name: 'start' }], rows: [['2026-07-02 16:00']] };
      },
    },
  }));
  function request(override = false) {
    return new Request('http://localhost/api/data/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(override),
    });
  }
  expect((await handle(request())).status).toBe(200);
  expect(sqlCalls).toBe(1);
  expect((await handle(request(true))).status).toBe(502);
  expect(sqlCalls).toBe(1);
  for (const invalid of [
    'not json',
    '{"from":"not a date"}',
    '{"from":{"anchor":"INVALID","offset":[]}}',
  ]) {
    hostValue = invalid;
    expect((await handle(request())).status).toBe(502);
  }
  expect(sqlCalls).toBe(1);
});

test('nonpositive fixed relative ranges are rejected by variables and HTTP input before querying', async () => {
  const period = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '1h',
    maxRangeDays: 1,
  });
  const unrestricted = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '1h',
  });
  const dataApp = defineDataApp({
    title: 'Validated range',
    description: 'Relative order',
    scope: { organization: 'test', environment: 'test' },
    queries: {
      events: {
        statement: 'SELECT $period.from AS start',
        params: { period: { type: 'dateTimeRange' } },
        projections: { start: { type: 'string' } },
      },
    },
  });
  const operation = dataApp.defineOperation({
    filters: { period },
    policy: { maxQueryRows: 1, maxDurationMs: 1000 },
    async run({ query }, input) {
      return (await query('events', input)).rows;
    },
  });
  const queryAll = vi.fn(async () => ({
    columns: [{ name: 'start' }],
    rows: [['start']],
  }));
  const handle = createDataHandler({ events: operation }, async () => ({
    lakehouse: { queryAll },
  }));
  for (const amount of [0, 1]) {
    for (const to of [
      null,
      { anchor: 'RELATIVE_ANCHOR_NOW' as const, offset: [] },
    ]) {
      const range: DateTimeRange = {
        from: {
          anchor: 'RELATIVE_ANCHOR_NOW',
          offset: [{ amount, unit: 'HOUR' }],
        },
        to,
      };
      expect(period.valid({ range })).toBe(false);
      expect(unrestricted.valid({ range })).toBe(false);
      expect(() => parseDateTimeRange(range)).toThrow(
        'Start must be before end.'
      );
      const response = await handle(
        new Request('http://localhost/api/data/events', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ period: range }),
        })
      );
      expect(response.status).toBe(400);
    }
  }
  expect(queryAll).not.toHaveBeenCalled();
  expect(period.valid(period.defaultValue)).toBe(true);
});

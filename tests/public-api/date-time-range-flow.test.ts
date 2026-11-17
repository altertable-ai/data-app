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
  resolvedDateTimeRangeParams,
  queryDateTimeRangeParams,
  resolveDateTimeRange,
  type DateTimeRange,
} from '@altertable/data-app/contract';
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

test('an operation binds resolved date filter bounds as DuckDB timestamp parameters', async () => {
  const periodFilter = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '7d',
  });
  const app = defineDataApp({
    title: 'Datetime',
    description: 'Datetime query',
    scope: { organization: 'test', environment: 'test' },
    queries: {
      events: {
        statement:
          'SELECT CAST($period_from AS TIMESTAMP) AS start, CAST($period_to AS TIMESTAMP) AS end',
        params: {
          period_from: { type: 'string' },
          period_to: { type: 'string' },
        },
        projections: { start: { type: 'string' }, end: { type: 'string' } },
      },
    },
  });
  const operation = app.defineOperation({
    filters: { period: periodFilter },
    policy: { maxQueryRows: 10, maxDurationMs: 1000 },
    async run({ query }, { period }) {
      return (
        await query(
          'events',
          queryDateTimeRangeParams(periodFilter, period, 'period').current
        )
      ).rows;
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
    period: periodFilter.request({ range: relative }),
  });
  expect(result.data).toEqual([{ start: 'start', end: 'end' }]);
  expect(sent?.statement).toBe(app.queries.events.statement);
  const bound = sent!.params as { period_from: string; period_to: string };
  expect(
    new Date(bound.period_to).getTime() - new Date(bound.period_from).getTime()
  ).toBe(7 * 86_400_000);
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

test('relative date bounds use the query clock, including comparison', () => {
  const filter = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '7d',
    comparison: 'off',
  });
  const selected = { range: relative, comparison: 'previous' as const };
  const requested = filter.request(selected, new Date('2026-01-08T12:00:00Z'));
  const parsed = filter.parseInput(JSON.parse(JSON.stringify(requested)));
  const bounds = queryDateTimeRangeParams(
    filter,
    parsed,
    'period',
    new Date('2026-01-09T12:00:00Z')
  );
  expect(bounds.current.period_to).toBe('2026-01-09T12:00:00.000');
  expect(bounds.current.period_from).toBe('2026-01-02T12:00:00.000');
  expect(bounds.comparison?.period_to).toBe(bounds.current.period_from);
  expect(bounds.combined.period_from).toBe(bounds.comparison?.period_from);
});

test('query registry rejects SDK-only SQL syntax while ignoring literals and comments', () => {
  const statement = `SELECT '$period.from' AS "a$period.to", $$ $period.from $$ AS literal, $count AS count -- $period.to\n/* outer /* $period.from */ comment */`;
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
  expect(app.queries.events.statement).toBe(statement);
  for (const syntax of [
    '$period.from',
    '$period.to',
    '$country.matches(c.country)',
  ])
    expect(() =>
      defineDataApp({
        title: 'Invalid',
        description: 'Invalid SQL',
        scope: { organization: 'test', environment: 'test' },
        queries: {
          events: {
            statement: `SELECT ${syntax} AS bound`,
            params: {},
            projections: { bound: { type: 'string' } },
          },
        },
      })
    ).toThrow('SDK-only SQL syntax');
});

test('SQL helpers produce parameterized bounds and reject unsafe structured values', () => {
  expect(
    resolvedDateTimeRangeParams(
      {
        from: new Date('2026-01-01T16:00:00.000Z'),
        to: new Date('2026-01-02T16:00:00.000Z'),
      },
      'period'
    )
  ).toEqual({
    period_from: '2026-01-01T16:00:00.000',
    period_to: '2026-01-02T16:00:00.000',
  });
  expect(() =>
    resolvedDateTimeRangeParams(
      { from: new Date(), to: new Date() },
      'period); DROP TABLE events'
    )
  ).toThrow();
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
        statement: String.raw`SELECT E'escaped\' $period.from' AS text, $period AS start`,
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
        statement: 'SELECT $period AS start',
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

test('nonpositive fixed relative ranges are rejected by variables before querying', async () => {
  const period = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '1h',
    maxRangeDays: 1,
  });
  const unrestricted = dateTimeRangeFilter({
    key: 'period',
    defaultValue: '1h',
  });
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
    }
  }
  expect(period.valid(period.defaultValue)).toBe(true);
});

import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app-react';
import {
  choiceVariable,
  createDataHooks,
  DataApp,
  DataSection,
  MetricWidget,
  Stack,
  TableWidget,
  VisualizationWidget,
} from '@altertable/data-app-react';
import { BarChart, ComposedChart } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineDateRangeContract,
  parseCount,
} from '@altertable/data-app/contract';
const dataApp = defineDataApp({
  title: 'Sample finding',
  description:
    'Fixture evidence; replace with the Finding and its supporting queries.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    samples: {
      projections: {
        period_start: { type: 'string' },
        member: { type: 'string' },
        selected: { type: 'boolean' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT strftime(date_trunc($grain, sample_date), '%Y-%m-%d') AS period_start,
  CASE WHEN $breakdown = 'group' THEN group_name ELSE segment_name END AS member,
  sample_date >= CAST($selected_start AS DATE) AS selected,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date BETWEEN CAST($start AS DATE) AND CAST($end AS DATE)
GROUP BY ALL ORDER BY period_start, member LIMIT $limit`,
      params: {
        start: { type: 'string', defaultValue: '2026-03-09' },
        end: { type: 'string', defaultValue: '2026-03-15' },
        selected_start: { type: 'string', defaultValue: '2026-03-09' },
        grain: { type: 'string', defaultValue: 'day' },
        breakdown: { type: 'string', defaultValue: 'segment' },
        limit: { type: 'number', defaultValue: 500 },
      },
    },
  },
});
const calendar = defineDateRangeContract({
  minDate: '2026-01-05',
  maxDate: '2026-03-29',
  maxRangeDays: 28,
  timeZone: 'UTC',
});
const findingPeriod = { start: '2026-03-09', end: '2026-03-15' };
const operations = {
  samples: dataApp.defineOperation({
    input: value => {
      const { period, grain, breakdown } = (value ?? {}) as Record<
        string,
        unknown
      >;
      if (grain !== 'day' && grain !== 'week')
        throw new Error('Expected a day or week grain.');
      if (breakdown !== 'segment' && breakdown !== 'group')
        throw new Error('Expected a segment or group breakdown.');
      return { period: calendar.parseRequest(period), grain, breakdown };
    },
    checks: [
      {
        period: calendar.request(findingPeriod, true),
        grain: 'day',
        breakdown: 'segment',
      },
      {
        period: calendar.request(findingPeriod),
        grain: 'week',
        breakdown: 'group',
      },
    ],
    policy: { maxQueryRows: 500, maxDurationMs: 15000 },
    async run({ query }, { period: { range, comparison }, grain, breakdown }) {
      const result = await query('samples', {
        start: comparison?.start ?? range.start,
        end: range.end,
        selected_start: range.start,
        grain,
        breakdown,
      });
      return result.rows.map(row => ({
        periodStart: row.period_start,
        member: row.member,
        sampleCount: parseCount(row.sample_count),
        selected: row.selected,
      }));
    },
  }),
};
const queryNames = operations.samples.queryNames;
const sampleDataContext = createDataContext(queryNames)({
  description:
    'Fictional daily samples from starter_demo.daily_samples. Replace this evidence with the actual Finding queries.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'Fixture samples recorded per day, group, and segment.',
      queryNames: [queryNames.samples],
    },
  },
});
const { defineTimeView } = createDataHooks(createDataClient({ operations }));
const samplesView = defineTimeView({
  dataContext: sampleDataContext,
  operation: 'samples',
  time: {
    contract: calendar,
    defaultValue: { kind: 'dates', ...findingPeriod },
    comparison: true,
  },
  variables: {
    grain: choiceVariable({
      key: 'grain',
      label: 'Grain',
      defaultValue: 'day',
      options: [
        { id: 'day', label: 'Day' },
        { id: 'week', label: 'Week' },
      ],
      presentation: { group: 'display', control: 'widget' },
    }),
    breakdown: choiceVariable({
      key: 'breakdown',
      label: 'Breakdown',
      defaultValue: 'segment',
      options: [
        { id: 'segment', label: 'Segment' },
        { id: 'group', label: 'Group' },
      ],
      presentation: { group: 'display', control: 'widget' },
    }),
  },
  isEmpty: rows => rows.length === 0,
  emptyFallback: {
    title: 'No samples in this period',
    description: 'No observations are available for this period.',
  },
});
type SampleRow = { sampleCount: number; selected: boolean };
function total(rows: readonly SampleRow[]) {
  return rows.reduce((sum, row) => sum + row.sampleCount, 0);
}
function totalsBy<Row extends SampleRow>(
  rows: readonly Row[],
  key: (row: Row) => string
) {
  const totals = new Map<string, number>();
  for (const row of rows)
    totals.set(key(row), (totals.get(key(row)) ?? 0) + row.sampleCount);
  return [...totals].map(([id, sampleCount]) => ({ id, sampleCount }));
}
const count = { kind: 'count' } as const;
const totalSamples = samplesView.metric(
  {
    id: 'total-samples',
    label: 'Samples',
    glossaryId: 'sampleCount',
    format: count,
  },
  (rows, input) => ({
    current: total(rows.filter(row => row.selected)),
    ...(input.period.comparison && {
      previous: total(rows.filter(row => !row.selected)),
    }),
  })
);
const trend = samplesView.dataset({
  name: 'Samples over time',
  select: rows => totalsBy(rows, row => row.periodStart),
  rowKey: row => row.id,
  columns: {
    id: { label: 'Period start', value: row => row.id },
    sampleCount: { value: row => row.sampleCount, format: count },
  },
  evidence: { id: 'samples-over-time', glossaryIds: ['sampleCount'] },
});
const breakdown = samplesView.dataset({
  name: 'Samples by member',
  select: rows =>
    totalsBy(
      rows.filter(row => row.selected),
      row => row.member
    ),
  rowKey: row => row.id,
  columns: {
    id: { label: 'Member', value: row => row.id },
    sampleCount: { value: row => row.sampleCount, format: count },
  },
  evidence: { id: 'samples-by-member', glossaryIds: ['sampleCount'] },
});
const sampleRows = samplesView.dataset({
  name: 'Samples',
  select: rows => rows.filter(row => row.selected),
  rowKey: row => `${row.periodStart}:${row.member}`,
  columns: {
    periodStart: { label: 'Period start', value: row => row.periodStart },
    member: { label: 'Member', value: row => row.member },
    sampleCount: { value: row => row.sampleCount, format: count },
  },
  evidence: { id: 'samples', glossaryIds: ['sampleCount'] },
});
// The Finding's text is shown above the app; keep content to charts and captions.
const sampleContent = samplesView.content(result => (
  <Stack>
    <MetricWidget metric={totalSamples} source={result} />
    <VisualizationWidget
      dataset={trend}
      source={result}
      title="Samples over time"
      description="Includes the previous period when comparison is on."
      breakdown={samplesView.breakdown('grain')}
    >
      {rows => (
        <ComposedChart
          ariaLabel="Samples over time"
          data={rows}
          valueFormat={count}
        >
          <ComposedChart.XAxis dataKey="id" />
          <ComposedChart.YAxis />
          <ComposedChart.Line dataKey="sampleCount" name="Samples" />
          <ComposedChart.Tooltip />
        </ComposedChart>
      )}
    </VisualizationWidget>
    <VisualizationWidget
      dataset={breakdown}
      source={result}
      title="Samples by member"
      breakdown={samplesView.breakdown('breakdown')}
    >
      {rows => (
        <BarChart
          ariaLabel="Samples by member"
          unit="samples"
          items={rows.map(row => ({
            ...row,
            label: row.id,
            value: row.sampleCount,
          }))}
        />
      )}
    </VisualizationWidget>
    <TableWidget dataset={sampleRows} source={result} title="Samples" />
  </Stack>
));
function App() {
  return (
    <DataApp view={samplesView} showToolbar={false}>
      <DataSection content={sampleContent} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

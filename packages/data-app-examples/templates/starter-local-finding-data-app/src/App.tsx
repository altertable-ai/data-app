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

import { sampleDataContext } from '#app/data-context.ts';
import type { operations } from '#app/operations.ts';
import { calendar, findingPeriod } from '#config';
const { defineTimeView } =
  createDataHooks(createDataClient<typeof operations>());
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
export function App() {
  return (
    <DataApp view={samplesView} showToolbar={false}>
      <DataSection content={sampleContent} />
    </DataApp>
  );
}

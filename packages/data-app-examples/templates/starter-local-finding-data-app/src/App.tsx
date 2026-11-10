import {
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
import { operationFilters } from '#app/filters.ts';
import type { operations } from '#app/operations.ts';
const { defineView } = createDataHooks(
  createDataClient<typeof operations>({ filters: operationFilters })
);
const count = { kind: 'count' } as const;
const emptyFallback = {
  title: 'No samples in this period',
  description: 'No observations are available for this period.',
};
const totalView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleTotal',
});
const totalSamples = totalView.metric(
  {
    id: 'total-samples',
    label: 'Samples',
    glossaryId: 'sampleCount',
    format: count,
  },
  total => ({
    current: total.current,
    ...(total.previous !== null && { previous: total.previous }),
  })
);
const trendView = defineView({
  dataContext: sampleDataContext,
  operation: 'samplesOverTime',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const trend = trendView.dataset({
  name: 'Samples over time',
  select: rows => rows,
  rowKey: row => row.periodStart,
  columns: {
    periodStart: { label: 'Period start', value: row => row.periodStart },
    sampleCount: { value: row => row.sampleCount, format: count },
  },
  evidence: { id: 'samples-over-time', glossaryIds: ['sampleCount'] },
});
const memberView = defineView({
  dataContext: sampleDataContext,
  operation: 'samplesByMember',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const byMember = memberView.dataset({
  name: 'Samples by member',
  select: rows => rows,
  rowKey: row => row.member,
  columns: {
    member: { label: 'Member', value: row => row.member },
    sampleCount: { value: row => row.sampleCount, format: count },
  },
  evidence: { id: 'samples-by-member', glossaryIds: ['sampleCount'] },
});
const rowsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleRows',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const sampleRows = rowsView.dataset({
  name: 'Samples',
  select: rows => rows,
  rowKey: row => `${row.periodStart}:${row.member}`,
  columns: {
    periodStart: { label: 'Period start', value: row => row.periodStart },
    member: { label: 'Member', value: row => row.member },
    sampleCount: { value: row => row.sampleCount, format: count },
  },
  evidence: { id: 'samples', glossaryIds: ['sampleCount'] },
});
// The Finding's text is shown above the app; keep content to charts and captions.
const totalContent = totalView.content(result => (
  <MetricWidget metric={totalSamples} source={result} />
));
const trendContent = trendView.content(result => (
  <VisualizationWidget
    dataset={trend}
    source={result}
    title="Samples over time"
    description="Includes the previous period when comparison is on."
    breakdown={trendView.breakdown('grain')}
  >
    {rows => (
      <ComposedChart
        ariaLabel="Samples over time"
        data={rows}
        valueFormat={count}
      >
        <ComposedChart.XAxis dataKey="periodStart" />
        <ComposedChart.YAxis />
        <ComposedChart.Line dataKey="sampleCount" name="Samples" />
        <ComposedChart.Tooltip />
      </ComposedChart>
    )}
  </VisualizationWidget>
));
const memberContent = memberView.content(result => (
  <VisualizationWidget
    dataset={byMember}
    source={result}
    title="Samples by member"
    breakdown={memberView.breakdown('breakdown')}
  >
    {rows => (
      <BarChart
        ariaLabel="Samples by member"
        unit="samples"
        items={rows.map(row => ({
          ...row,
          id: row.member,
          label: row.member,
          value: row.sampleCount,
        }))}
      />
    )}
  </VisualizationWidget>
));
const rowsContent = rowsView.content(result => (
  <TableWidget dataset={sampleRows} source={result} title="Samples" />
));
export function App() {
  return (
    <DataApp view={totalView} showToolbar={false}>
      <Stack>
        <DataSection content={totalContent} />
        <DataSection content={trendContent} />
        <DataSection content={memberContent} />
        <DataSection content={rowsContent} />
      </Stack>
    </DataApp>
  );
}

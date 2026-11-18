import {
  createDataHooks,
  DataApp,
  DataSection,
  Button,
  DataValue,
  Grid,
  GridItem,
  TextContent,
  Stack,
  TableWidget,
  VisualizationWidget,
} from '@altertable/data-app-react';
import {
  BarChart,
  ComposedChart,
  useAppFilters,
} from '@altertable/data-app-react/ui';

import { sampleDataContext } from '#app/data-context.ts';
import {
  findingPeriodLabel,
  periodFilter,
  groupName,
  grain,
  breakdown,
} from '#app/filters.ts';
import { operations } from '#app/operations.ts';
const { defineView } = createDataHooks(operations.createDataClient());
const count = { kind: 'count' } as const;
const emptyFallback = {
  title: 'No samples in this period',
  description: 'No observations are available for this period.',
};
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
const trendContent = trendView.content(result => (
  <VisualizationWidget
    dataset={trend}
    source={result}
    title="Samples over time"
    description={
      <>
        Showing <DataValue scope={result.scope} />.
      </>
    }
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
    title="By member"
    description={
      <>
        Showing <DataValue scope={result.scope} />.
      </>
    }
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
  <TableWidget
    dataset={sampleRows}
    source={result}
    title="Sample details"
    description={
      <>
        Showing <DataValue scope={result.scope} />. Up to 500 period and member
        totals.
      </>
    }
  />
));
// Controls describe the requested scope; each widget caption describes its displayed result.
function FindingScope() {
  const filters = useAppFilters({
    period: periodFilter,
    groupName,
    grain,
    breakdown,
  });
  const scopeChanged =
    !periodFilter.same(filters.values.period, periodFilter.defaultValue) ||
    !groupName.same(filters.values.groupName, groupName.defaultValue);
  const displayChanged =
    !grain.same(filters.values.grain, grain.defaultValue) ||
    !breakdown.same(filters.values.breakdown, breakdown.defaultValue);
  return (
    <TextContent>
      <p>
        Finding scope: {findingPeriodLabel} {periodFilter.policy.timeZone} ·
        group{' '}
        {groupName.describe?.(groupName.defaultValue) ?? groupName.defaultValue}
        . Queries use current source data.
      </p>
      {scopeChanged && (
        <p>
          <output>Exploration: scope changed</output>
        </p>
      )}
      {(scopeChanged || displayChanged) && (
        <Button size="compact" onClick={() => filters.resetAll()}>
          Back to finding
        </Button>
      )}
    </TextContent>
  );
}
export function App() {
  return (
    <DataApp view={trendView} showToolbar={false}>
      <Stack>
        <FindingScope />
        <Grid columns={3}>
          <GridItem span={2}>
            <DataSection content={trendContent} />
          </GridItem>
          <GridItem>
            <DataSection content={memberContent} />
          </GridItem>
        </Grid>
        <details>
          <summary>View detailed data</summary>
          <DataSection content={rowsContent} />
        </details>
      </Stack>
    </DataApp>
  );
}

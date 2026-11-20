import {
  createDataHooks,
  DataApp,
  DataSection,
  Button,
  Grid,
  GridItem,
  Notice,
  Stack,
  TableWidget,
  VisualizationWidget,
  Ranking,
  Comparison,
} from '@altertable/data-app-react';
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useViewTab,
  ComposedChart,
  useAppFilters,
} from '@altertable/data-app-react/ui';
import {
  formatCount,
  formatNumber,
  formatPercent,
} from '@altertable/data-app/format';

import { sampleDataContext } from '#app/data-context.ts';
import {
  findingPeriodLabel,
  periodLabel,
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
const totalsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleTotals',
  emptyFallback,
});
const totals = totalsView.dataset({
  name: 'Period totals',
  rowKey: () => 'total',
  columns: {
    currentCount: {
      label: 'Selected period',
      format: count,
    },
    previousCount: {
      label: 'Previous period',
      format: count,
    },
  },
  evidence: { id: 'period-totals', glossaryIds: ['sampleCount'] },
});
const trendView = defineView({
  dataContext: sampleDataContext,
  operation: 'samplesOverTime',
  emptyFallback,
});
const trend = trendView.dataset({
  name: 'Samples over time',
  rowKey: row => row.periodStart,
  columns: {
    periodStart: { label: 'Period start' },
    sampleCount: { format: count },
  },
  evidence: { id: 'samples-over-time', glossaryIds: ['sampleCount'] },
});
const memberView = defineView({
  dataContext: sampleDataContext,
  operation: 'samplesByMember',
  emptyFallback,
});
const byMember = memberView.dataset({
  name: 'Member comparison',
  rowKey: row => row.member,
  columns: {
    member: { label: 'Member' },
    currentCount: {
      label: 'Selected period',
      format: count,
    },
    previousCount: {
      label: 'Previous period',
      format: count,
    },
    change: {
      label: 'Change',
      format: row => formatNumber(row.change, { signDisplay: 'exceptZero' }),
    },
    changeRate: {
      label: 'Change %',
      format: row => formatPercent(row.changeRate),
    },
  },
  evidence: {
    id: 'samples-by-member',
    glossaryIds: ['sampleCount', 'sampleChange'],
  },
});
const selectedMembers = memberView.dataset({
  name: 'Selected-period samples',
  rowKey: row => row.member,
  columns: {
    member: { label: 'Member' },
    currentCount: {
      label: 'Samples',
      format: count,
    },
  },
  evidence: { id: 'selected-members', glossaryIds: ['sampleCount'] },
});
const rowsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleRows',
  emptyFallback,
});
const sampleRows = rowsView.dataset({
  name: 'Samples',
  rowKey: row => `${row.periodStart}:${row.member}`,
  columns: {
    periodStart: { label: 'Period start' },
    member: { label: 'Member' },
    sampleCount: { format: count },
  },
  evidence: { id: 'samples', glossaryIds: ['sampleCount'] },
});
// Compare current and previous periods from the same displayed result.
const totalsContent = totalsView.content(result => (
  <VisualizationWidget
    dataset={totals}
    source={result}
    title={
      result.loading || result.input.period.comparison
        ? 'Period comparison'
        : 'Selected period'
    }
  >
    {rows =>
      result.loading ? null : result.input.period.comparison ? (
        <Comparison
          label="Samples"
          current={{
            value: rows[0]!.currentCount,
            formattedValue: formatCount(rows[0]!.currentCount),
            periodLabel: periodLabel(result.input.period.range),
          }}
          previous={{
            value: rows[0]!.previousCount,
            formattedValue: formatCount(rows[0]!.previousCount, {
              missing: 'Not available',
            }),
            periodLabel: periodLabel(result.input.period.comparison),
          }}
        />
      ) : (
        <Ranking
          items={[
            {
              id: 'selected',
              label: periodLabel(result.input.period.range),
              value: rows[0]!.currentCount,
            },
          ]}
        />
      )
    }
  </VisualizationWidget>
));
const trendContent = trendView.content(result => (
  <VisualizationWidget
    dataset={trend}
    source={result}
    title="Samples over time"
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
    title={
      result.loading || result.input.period.comparison
        ? 'Where volume changed'
        : 'Samples by member'
    }
    breakdown={memberView.breakdown('breakdown')}
  >
    {rows => (
      <ComposedChart
        ariaLabel="Samples by member"
        data={rows}
        valueFormat={count}
      >
        <ComposedChart.XAxis dataKey="member" />
        <ComposedChart.YAxis />
        {!result.loading && result.input.period.comparison && (
          <ComposedChart.Bar
            dataKey="previousCount"
            name="Previous period"
            fill="var(--atbl-muted)"
            fillOpacity={0.45}
          />
        )}
        <ComposedChart.Bar dataKey="currentCount" name="Selected period" />
        <ComposedChart.Tooltip />
        <ComposedChart.Legend />
      </ComposedChart>
    )}
  </VisualizationWidget>
));
const memberTableContent = memberView.content(result => (
  <TableWidget
    dataset={
      result.loading || result.input.period.comparison
        ? byMember
        : selectedMembers
    }
    source={result}
    title={
      result.loading || result.input.period.comparison
        ? 'Change by member'
        : 'Samples by member'
    }
  />
));
const rowsContent = rowsView.content(result => (
  <TableWidget dataset={sampleRows} source={result} title="Sample details" />
));
// Show this notice when scope or display choices differ from the original finding.
// Back to finding restores both scope filters and display choices to their defaults.
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
  if (!scopeChanged && !displayChanged) return null;
  return (
    <Notice
      title={
        scopeChanged
          ? 'Exploring a different scope'
          : 'Viewing a different breakdown'
      }
      description={
        <>
          Original finding · {findingPeriodLabel} {periodFilter.policy.timeZone}{' '}
          vs previous period ·{' '}
          {groupName.describe?.(groupName.defaultValue) ??
            groupName.defaultValue}
        </>
      }
      action={
        <Button size="compact" onClick={() => filters.resetAll()}>
          Back to finding
        </Button>
      }
    />
  );
}
const views = ['overview', 'data'] as const;
export function App() {
  const [view, setView] = useViewTab(views, 'overview');
  return (
    <DataApp view={trendView} showToolbar={false}>
      <Stack>
        <FindingScope />
        <Tabs selectedKey={view} onSelectionChange={setView}>
          <TabList aria-label="Finding views">
            <Tab id="overview">Overview</Tab>
            <Tab id="data">Data</Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="overview">
              <Stack>
                <Grid columns={3}>
                  <GridItem span={2}>
                    <DataSection content={trendContent} />
                  </GridItem>
                  <GridItem>
                    <DataSection content={totalsContent} />
                  </GridItem>
                </Grid>
                <DataSection content={memberContent} />
              </Stack>
            </TabPanel>
            <TabPanel id="data">
              <Stack>
                <DataSection content={memberTableContent} />
                <DataSection content={rowsContent} />
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </DataApp>
  );
}

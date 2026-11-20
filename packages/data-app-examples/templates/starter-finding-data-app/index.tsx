import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  mountDataApp,
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
  choiceFilter,
  dateTimeRangeFilter,
  displayChoice,
  parseCount,
  queryDateTimeRangeParams,
} from '@altertable/data-app/contract';
import {
  formatDateRange,
  formatCount,
  formatNumber,
  formatPercent,
} from '@altertable/data-app/format';
export const dataApp = defineDataApp({
  // Replace the demo title, description, and scope labels with the app's identity.
  title: 'Sample finding',
  description:
    'Explore sample volume over time and across groups and segments.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  // starter_demo.daily_samples contains seeded fictional observations.
  // Replace these queries with verified sources before publishing.
  queries: {
    sampleTotals: {
      projections: { sample_count: { type: 'number' } },
      statement: `
SELECT SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
HAVING COUNT(*) > 0`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
      },
    },
    samplesOverTime: {
      projections: {
        period_start: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT strftime(date_trunc($grain, sample_date), '%Y-%m-%d') AS period_start,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
GROUP BY ALL ORDER BY period_start LIMIT 200`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
        grain: { type: 'string', defaultValue: 'day' },
      },
    },
    samplesByMember: {
      projections: {
        member: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT CASE WHEN $breakdown = 'group' THEN group_name ELSE segment_name END AS member,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
GROUP BY ALL ORDER BY sample_count DESC LIMIT 50`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
        breakdown: { type: 'string', defaultValue: 'segment' },
      },
    },
    sampleRows: {
      projections: {
        period_start: { type: 'string' },
        member: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT strftime(date_trunc($grain, sample_date), '%Y-%m-%d') AS period_start,
  CASE WHEN $breakdown = 'group' THEN group_name ELSE segment_name END AS member,
  SUM(sample_count) AS sample_count
FROM starter_demo.daily_samples
WHERE sample_date >= CAST($period_from AS TIMESTAMP) AND sample_date < CAST($period_to AS TIMESTAMP)
  AND ($groupName = 'all' OR group_name = $groupName)
GROUP BY ALL ORDER BY period_start, member LIMIT 500`,
      params: {
        groupName: { type: 'string', defaultValue: 'Alpha' },
        period_from: { type: 'string' },
        period_to: { type: 'string' },
        grain: { type: 'string', defaultValue: 'day' },
        breakdown: { type: 'string', defaultValue: 'segment' },
      },
    },
  },
});
// Replace this fictional finding period with the period supported by its evidence.
const findingPeriod = {
  from: new Date('2026-03-09T00:00:00Z'),
  to: new Date('2026-03-16T00:00:00Z'),
};
function periodLabel(range: { from: Date; to: Date }) {
  return formatDateRange({
    start: range.from.toISOString().slice(0, 10),
    end: new Date(range.to.getTime() - 1).toISOString().slice(0, 10),
  });
}
const findingPeriodLabel = periodLabel(findingPeriod);
const periodFilter = dateTimeRangeFilter({
  key: 'period',
  defaultValue: findingPeriod,
  comparison: 'on',
  // These bounds match the seeded demo history. Use the real source coverage.
  minDate: '2026-01-05',
  maxDate: '2026-03-29',
  maxRangeDays: 28,
  presets: [{ label: 'Finding period', range: findingPeriod }],
});
const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'Alpha',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Beta', label: 'Beta' },
  ],
});
const grain = displayChoice({
  key: 'grain',
  label: 'Grain',
  defaultValue: 'day',
  options: [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
  ],
  presentation: { control: 'widget' },
});
const breakdown = displayChoice({
  key: 'breakdown',
  label: 'Breakdown',
  defaultValue: 'segment',
  options: [
    { id: 'segment', label: 'Segment' },
    { id: 'group', label: 'Group' },
  ],
  presentation: { control: 'widget' },
});

const operationFilters = {
  sampleTotals: { period: periodFilter, groupName },
  samplesOverTime: { period: periodFilter, groupName, grain },
  samplesByMember: { period: periodFilter, groupName, breakdown },
  sampleRows: { period: periodFilter, groupName, grain, breakdown },
};
const policy = { maxQueryRows: 500, maxDurationMs: 15000 };
export const operations = dataApp.defineOperations({
  sampleTotals: dataApp.defineOperation({
    filters: operationFilters.sampleTotals,
    policy,
    async run({ query }, { period, groupName }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const [current, previous] = await Promise.all([
        query('sampleTotals', { ...bounds.current, groupName }),
        bounds.comparison
          ? query('sampleTotals', { ...bounds.comparison, groupName })
          : null,
      ]);
      const row = current.rows[0];
      if (!row) return [];
      const baseline = previous?.rows[0];
      return [
        {
          currentCount: parseCount(row.sample_count),
          previousCount: baseline ? parseCount(baseline.sample_count) : null,
        },
      ];
    },
  }),
  samplesOverTime: dataApp.defineOperation({
    filters: operationFilters.samplesOverTime,
    policy,
    async run({ query }, { period, groupName, grain }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('samplesOverTime', {
        ...bounds.combined,
        groupName,
        grain,
      });
      return result.rows.map(row => ({
        periodStart: row.period_start,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  samplesByMember: dataApp.defineOperation({
    filters: operationFilters.samplesByMember,
    policy,
    async run({ query }, { period, groupName, breakdown }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const [current, previous] = await Promise.all([
        query('samplesByMember', { ...bounds.current, groupName, breakdown }),
        bounds.comparison
          ? query('samplesByMember', {
              ...bounds.comparison,
              groupName,
              breakdown,
            })
          : null,
      ]);
      const currentCounts = new Map(
        current.rows.map(row => [row.member, parseCount(row.sample_count)])
      );
      const previousCounts = new Map(
        previous?.rows.map(row => [row.member, parseCount(row.sample_count)])
      );
      const members = new Set([
        ...currentCounts.keys(),
        ...previousCounts.keys(),
      ]);
      return [...members]
        .map(member => {
          const currentCount = currentCounts.get(member) ?? null;
          const previousCount = previousCounts.get(member) ?? null;
          const change =
            currentCount !== null && previousCount !== null
              ? currentCount - previousCount
              : null;
          return {
            member,
            currentCount,
            previousCount,
            change,
            changeRate:
              change !== null && previousCount !== null && previousCount > 0
                ? change / previousCount
                : null,
          };
        })
        .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0));
    },
  }),
  sampleRows: dataApp.defineOperation({
    filters: operationFilters.sampleRows,
    policy,
    async run({ query }, { period, groupName, grain, breakdown }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('sampleRows', {
        ...bounds.combined,
        groupName,
        grain,
        breakdown,
      });
      return result.rows.map(row => ({
        periodStart: row.period_start,
        member: row.member,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
});
const sampleDataContext = createDataContext(dataApp.queryNames)({
  description:
    'Fictional daily sample counts by group and segment. Comparisons use equal-length periods in UTC.',
  glossary: {
    sampleChange: {
      term: 'Sample change',
      definition:
        'Selected-period samples minus the previous equal-length period in the same scope. Missing observations remain unavailable; they are not measured zeroes.',
      queryNames: ['samplesByMember'],
    },
    sampleCount: {
      term: 'Sample count',
      definition:
        'Number of samples recorded for each day, group, and segment.',
      queryNames: Object.values(dataApp.queryNames),
    },
  },
});
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
function App() {
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

mountDataApp({ app: dataApp, component: App });

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
import { formatDateRange } from '@altertable/data-app/format';
// One query per widget: each section loads its own result when it nears the viewport.
export const dataApp = defineDataApp({
  title: 'Sample finding',
  description:
    'Explore sample volume over time and across groups and segments.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
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
// Declare each filter once; each operation lists the filters it reads.
const findingPeriod = {
  from: new Date('2026-03-02T00:00:00Z'),
  to: new Date('2026-03-16T00:00:00Z'),
};
const findingPeriodLabel = formatDateRange({
  start: findingPeriod.from.toISOString().slice(0, 10),
  end: new Date(findingPeriod.to.getTime() - 1).toISOString().slice(0, 10),
});
const periodFilter = dateTimeRangeFilter({
  key: 'period',
  defaultValue: findingPeriod,
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
const policy = { maxQueryRows: 500, maxDurationMs: 15000 };
export const operations = dataApp.defineOperations({
  samplesOverTime: dataApp.defineOperation({
    filters: { period: periodFilter, groupName, grain },
    policy,
    async run({ query }, { period, groupName, grain }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('samplesOverTime', {
        ...bounds.current,
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
    filters: { period: periodFilter, groupName, breakdown },
    policy,
    async run({ query }, { period, groupName, breakdown }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('samplesByMember', {
        ...bounds.current,
        groupName,
        breakdown,
      });
      return result.rows.map(row => ({
        member: row.member,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  sampleRows: dataApp.defineOperation({
    filters: { period: periodFilter, groupName, grain, breakdown },
    policy,
    async run({ query }, { period, groupName, grain, breakdown }) {
      const bounds = queryDateTimeRangeParams(periodFilter, period, 'period');
      const result = await query('sampleRows', {
        ...bounds.current,
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
const queryNames = {
  ...operations.samplesOverTime.queryNames,
  ...operations.samplesByMember.queryNames,
  ...operations.sampleRows.queryNames,
};
const sampleDataContext = createDataContext(queryNames)({
  description:
    'Fictional daily samples from starter_demo.daily_samples. Replace this evidence with the actual Finding queries.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'Fixture samples recorded per day, group, and segment.',
      queryNames: Object.values(queryNames),
    },
  },
});
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
    title="Breakdown"
    breakdown={memberView.breakdown('breakdown')}
  >
    {rows => (
      <Ranking
        aria-label="Samples by member"
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
  <TableWidget dataset={sampleRows} source={result} title="Sample details" />
));
// Keep the original finding identifiable during exploration.
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
          ·{' '}
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
              <Grid columns={3}>
                <GridItem span={2}>
                  <DataSection content={trendContent} />
                </GridItem>
                <GridItem>
                  <DataSection content={memberContent} />
                </GridItem>
              </Grid>
            </TabPanel>
            <TabPanel id="data">
              <DataSection content={rowsContent} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </DataApp>
  );
}
mountDataApp({ app: dataApp, component: App });

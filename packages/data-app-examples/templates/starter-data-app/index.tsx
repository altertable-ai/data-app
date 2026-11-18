import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  TableWidget,
  VisualizationWidget,
  Stack,
  Grid,
  GridItem,
  mountDataApp,
  MetricWidget,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';
import { parseCount, choiceFilter } from '@altertable/data-app/contract';
import { formatCount } from '@altertable/data-app/format';

export const dataApp = defineDataApp({
  title: 'Sample counts',
  description: 'Explore sample counts by group.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    sampleCountsByGroup: {
      projections: {
        group_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Gamma', 650000), ('Delta', 150000), ('Beta', 0))
SELECT group_name, sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
ORDER BY sample_count DESC, group_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    sampleTotal: {
      projections: { sample_count: { type: 'number' } },
      statement: `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Gamma', 650000), ('Delta', 150000), ('Beta', 0))
SELECT CAST(SUM(sample_count) AS BIGINT) AS sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
HAVING COUNT(*) > 0`,
      params: { groupName: { type: 'string', defaultValue: '' } },
    },
  },
});
// Declare each filter once; operations list the filters they read, and views,
// controls, and scope derive from them.
const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Gamma', label: 'Gamma' },
    { id: 'Delta', label: 'Delta' },
    { id: 'Beta', label: 'Beta' },
  ],
});
type SampleGroup = Exclude<typeof groupName.defaultValue, 'all'>;

/** The fixture queries read an empty group name as every group. */
function queryGroup(groupName: string) {
  return groupName === 'all' ? '' : groupName;
}
export const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsByGroup', {
        groupName: queryGroup(groupName),
      });
      return queryResult.rows.map(
        (row): { groupName: SampleGroup; sampleCount: number } => {
          const groupName = row.group_name;
          if (
            groupName !== 'Alpha' &&
            groupName !== 'Gamma' &&
            groupName !== 'Delta' &&
            groupName !== 'Beta'
          )
            throw new Error('Unexpected fixture group.');
          return { groupName, sampleCount: parseCount(row.sample_count) };
        }
      );
    },
  }),
  sampleTotal: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleTotal', {
        groupName: queryGroup(groupName),
      });
      const row = queryResult.rows[0];
      return row ? { sampleCount: parseCount(row.sample_count) } : null;
    },
  }),
});
const queryNames = {
  ...operations.sampleCountsByGroup.queryNames,
  ...operations.sampleTotal.queryNames,
};
const sampleDataContext = createDataContext(queryNames)({
  description:
    'Fictional recorded sample counts for four groups, including a measured zero.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'Number of recorded samples. Totals sum the groups in the selected scope; zero denotes a measured count.',
      queryNames: [queryNames.sampleCountsByGroup, queryNames.sampleTotal],
    },
  },
});
const { defineView } = createDataHooks(operations.createDataClient());
const sampleCountsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  isEmpty: sampleCounts => sampleCounts.length === 0,
  emptyFallback: {
    title: 'No matching groups',
    description: 'Choose another group or select All groups.',
  },
});
const sampleCounts = sampleCountsView.dataset({
  name: 'Sample counts',
  select: rows => rows,
  rowKey: row => row.groupName,
  columns: {
    groupName: { label: 'Group', value: row => row.groupName },
    sampleCount: { value: row => row.sampleCount, format: { kind: 'count' } },
  },
  evidence: {
    id: 'counts-by-group',
    glossaryIds: ['sampleCount'],
  },
});
const sampleTotalView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleTotal',
  isEmpty: total => total === null,
  emptyFallback: {
    title: 'No total for this selection',
    description: 'Choose a matching group to inspect its recorded samples.',
  },
});
const totalSamples = sampleTotalView.metric(
  {
    id: 'total-samples',
    glossaryId: 'sampleCount',
    label: 'Total samples',
    format: { kind: 'count', compact: true },
  },
  total => {
    if (total === null) throw new Error('No measured total in this selection.');
    return { current: total.sampleCount };
  }
);
const totalContent = sampleTotalView.content(result => (
  <MetricWidget metric={totalSamples} source={result} />
));
const groupActions = sampleCounts.actions(
  action => ({
    filter: action.filter({
      label: 'Filter to group',
      target: sampleCountsView.filter(),
      values: row => ({ groupName: row.groupName }),
    }),
  }),
  { primary: 'filter' }
);
const overviewContent = sampleCountsView.content(result => (
  <Grid columns={3}>
    <GridItem span={2}>
      <VisualizationWidget
        dataset={sampleCounts}
        source={result}
        title="Samples by group"
        actions={groupActions}
      >
        {(rows, actions) => (
          <BarChart
            ariaLabel="Sample counts by group"
            unit="samples"
            items={rows.map(row => ({
              ...row,
              id: row.groupName,
              label: `${row.groupName} · ${formatCount(row.sampleCount, { compact: true })}`,
              value: row.sampleCount,
            }))}
            itemActions={actions}
          />
        )}
      </VisualizationWidget>
    </GridItem>
    <GridItem>
      <Stack>
        <DataSection content={totalContent} label="Sample total" />
        <TableWidget
          dataset={sampleCounts}
          source={result}
          title="Counts by group"
          pagination={false}
        />
      </Stack>
    </GridItem>
  </Grid>
));
function App() {
  return (
    <DataApp view={sampleCountsView} summaryViews={[sampleTotalView]}>
      <DataSection content={overviewContent} label="Sample overview" />
    </DataApp>
  );
}
mountDataApp({ app: dataApp, component: App });

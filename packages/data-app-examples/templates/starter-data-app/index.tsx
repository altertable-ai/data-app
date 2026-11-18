import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  TableWidget,
  Grid,
  GridItem,
  mountDataApp,
  MetricWidget,
} from '@altertable/data-app-react';
import { parseCount, searchFilter } from '@altertable/data-app/contract';

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
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Beta', 0))
SELECT group_name, sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
ORDER BY group_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    sampleTotal: {
      projections: { sample_count: { type: 'number' } },
      statement: `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Beta', 0))
SELECT CAST(SUM(sample_count) AS BIGINT) AS sample_count FROM sample_counts
WHERE $groupName = '' OR group_name = $groupName
HAVING COUNT(*) > 0`,
      params: { groupName: { type: 'string', defaultValue: '' } },
    },
  },
});
// Declare each filter once; operations list the filters they read, and views,
// controls, and scope derive from them.
const groupName = searchFilter({ key: 'group', label: 'Group' });
export const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsByGroup', { groupName });
      return queryResult.rows.map(row => ({
        groupName: row.group_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  sampleTotal: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleTotal', { groupName });
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
    'Fictional recorded sample counts for two groups, including a measured zero.',
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
    description: 'Try Alpha, Beta, or clear the group filter.',
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
const overviewContent = sampleCountsView.content(result => (
  <Grid columns={3}>
    <GridItem>
      <DataSection content={totalContent} label="Sample total" />
    </GridItem>
    <GridItem span={2}>
      <TableWidget
        dataset={sampleCounts}
        source={result}
        title="Counts by group"
        pagination={false}
      />
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

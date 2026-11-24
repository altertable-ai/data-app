import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  mountDataApp,
  VisualizationWidget,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';
import { choiceFilter } from '@altertable/data-app/contract';

export const dataApp = defineDataApp({
  // Replace the demo title, description, and scope labels with the app's identity.
  title: 'Sample counts',
  description: 'Compare fictional sample counts across groups.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    sampleCountsByGroup: {
      // Fictional rows. Replace the CTE with an inspected source.
      statement: `
WITH sample_counts(group_name, sample_count) AS (
  VALUES ('Alpha', 1200), ('Alpha', 800), ('Beta', 450), ('Gamma', 0)
)
SELECT group_name, CAST(SUM(sample_count) AS BIGINT) AS sample_count
FROM sample_counts
WHERE $groupName = 'all' OR group_name = $groupName
GROUP BY group_name
ORDER BY sample_count DESC, group_name
LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: 'all' },
        limit: { type: 'number', defaultValue: 10 },
      },
      projections: {
        group_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
    },
  },
});

// The options match the fictional rows; the query treats 'all' as every group.
const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Beta', label: 'Beta' },
    { id: 'Gamma', label: 'Gamma' },
  ],
});

export const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10 },
    async run({ query }, { groupName }) {
      const { rows } = await query('sampleCountsByGroup', { groupName });
      return rows.map(row => ({
        groupName: row.group_name,
        sampleCount: row.sample_count,
      }));
    },
  }),
});

// Replace the description and definitions with verified source metadata.
const dataContext = createDataContext(dataApp.queryNames)({
  description:
    'Fictional sample counts by group. Gamma has a recorded count of zero.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'Sum of recorded samples in the selected group scope. Additive across groups.',
      queryNames: [dataApp.queryNames.sampleCountsByGroup],
    },
  },
});

const { defineView } = createDataHooks(operations.createDataClient());
const sampleCountsView = defineView({
  dataContext,
  operation: 'sampleCountsByGroup',
  emptyFallback: {
    title: 'No matching groups',
    description: 'Choose another group.',
  },
});
const sampleCounts = sampleCountsView.dataset({
  name: 'Sample counts',
  rowKey: row => row.groupName,
  columns: {
    groupName: { label: 'Group' },
    sampleCount: { format: { kind: 'count' } },
  },
  evidence: { id: 'counts-by-group', glossaryIds: ['sampleCount'] },
});
const countsContent = sampleCountsView.widget('samples-by-group', result => (
  <VisualizationWidget
    dataset={sampleCounts}
    source={result}
    title="Samples by group"
  >
    {rows => (
      <BarChart
        ariaLabel="Sample counts by group"
        unit="samples"
        valueFormat={{ kind: 'count' }}
        showYAxis
        scrollToEnd={false}
        items={rows.map(row => ({
          id: row.groupName,
          label: row.groupName,
          value: row.sampleCount,
        }))}
      />
    )}
  </VisualizationWidget>
));

function App() {
  return (
    <DataApp
      view={sampleCountsView}
      datasets={[sampleCounts]}
      widgets={[countsContent]}
    >
      <DataSection content={countsContent} />
    </DataApp>
  );
}

mountDataApp({ app: dataApp, component: App });

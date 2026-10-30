import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app-react';
import {
  createDataHooks,
  DataApp,
  DataSection,
  VisualizationWidget,
  Stack,
  TextContent,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import { parseCount } from '@altertable/data-app/contract';
const dataApp = defineDataApp({
  title: 'Sample finding',
  description:
    'Fixture evidence; replace with the Finding and its supporting queries.',
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
  },
});
const operations = {
  sampleCountsByGroup: dataApp.defineOperation({
    input: () => ({}),
    checks: [{}],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }) {
      const result = await query('sampleCountsByGroup', {});
      return result.rows.map(row => ({
        groupName: row.group_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
};
const queryNames = operations.sampleCountsByGroup.queryNames;
const sampleDataContext = createDataContext(queryNames)({
  description:
    'Two SQL VALUES rows demonstrate the host query path. Replace them with inspected source data before publishing findings.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'A fixture value: Alpha is 2,200,000 and Beta is a measured zero.',
      queryNames: [queryNames.sampleCountsByGroup],
    },
  },
});
const { defineDataView } = createDataHooks(createDataClient({ operations }));
const sampleCountsView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  describeInput: () => 'fixture groups',
  isEmpty: sampleCounts => sampleCounts.length === 0,
  emptyFallback: {
    title: 'No matching groups',
    description: 'No observations are available for this query.',
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
const sampleContent = sampleCountsView.content(result => (
  <Stack>
    <TextContent>
      <h2>Supporting evidence</h2>
      <p>
        These fixture rows demonstrate how a Finding can include a small
        supporting visual. Replace this section with the Finding's own argument
        and evidence.
      </p>
    </TextContent>
    <VisualizationWidget
      dataset={sampleCounts}
      source={result}
      title="Sample count"
      description="Fixture values, not a published metric."
    >
      {(rows, actions) => (
        <BarChart
          ariaLabel="Sample counts by group"
          unit="samples"
          items={rows.map(row => ({
            ...row,
            id: row.groupName,
            label: row.groupName,
            value: row.sampleCount,
          }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
    <TextContent>
      <h2>Limitations</h2>
      <p>
        SQL VALUES are demonstration data and support no business conclusion.
      </p>
    </TextContent>
  </Stack>
));
function App() {
  return (
    <DataApp view={sampleCountsView} showToolbar={false}>
      <DataSection content={sampleContent} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

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
  DataValue,
  TableWidget,
  Ranking,
  Stack,
  TextContent,
} from '@altertable/data-app-react';
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
SELECT group_name, SUM(sample_count) AS sample_count
FROM starter_demo.sample_counts
WHERE $groupName = '' OR group_name = $groupName
GROUP BY group_name ORDER BY sample_count DESC LIMIT $limit`,
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
    'Fictional sample volumes grouped from starter_demo.sample_counts. Replace this evidence with the actual Finding queries.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'A fixture value: Alpha is 2,200,000 and Beta is 600,000.',
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
const totalSamples = sampleCountsView.metric(
  {
    id: 'total-samples',
    label: 'Total samples',
    glossaryId: 'sampleCount',
    format: { kind: 'count' },
  },
  rows => ({ current: rows.reduce((sum, row) => sum + row.sampleCount, 0) })
);
const alphaSamples = sampleCountsView.metric(
  {
    id: 'alpha-samples',
    label: 'Alpha samples',
    glossaryId: 'sampleCount',
    format: { kind: 'count' },
  },
  rows => {
    const alpha = rows.find(row => row.groupName === 'Alpha');
    if (!alpha)
      throw new Error('The sample Finding requires evidence for Alpha.');
    return { current: alpha.sampleCount };
  }
);
// This fictional Finding demonstrates prose, inline evidence, and a Markdown-table equivalent.
// Preserve each real Finding's own headings and argument instead of reusing these sections.
const sampleContent = sampleCountsView.content(result => (
  <Stack>
    <TextContent>
      <h2>Contribution by group</h2>
      <p>
        <strong>Alpha</strong> contributed{' '}
        <DataValue metric={alphaSamples} source={result} /> of the{' '}
        <DataValue metric={totalSamples} source={result} /> recorded samples.
        The group comparison below supports that concentration; it does not
        explain its cause.
      </p>
    </TextContent>
    <VisualizationWidget
      dataset={sampleCounts}
      source={result}
      title="Sample count"
    >
      {rows => (
        <Ranking
          aria-label="Samples by group"
          items={rows.map(row => ({
            id: row.groupName,
            label: row.groupName,
            value: row.sampleCount,
          }))}
        />
      )}
    </VisualizationWidget>
    <TextContent>
      <h2>Supporting evidence</h2>
      <p>
        The source rows are grouped by <code>group_name</code> and summed using{' '}
        <code>sample_count</code>. The table retains the exact values behind the
        comparison.
      </p>
      <ul>
        <li>Compare the groups within the same sample population.</li>
        <li>
          <em>Volume alone does not establish performance or causality.</em>
        </li>
      </ul>
    </TextContent>
    <TableWidget
      dataset={sampleCounts}
      source={result}
      title="Counts by group"
      pagination={false}
    />
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

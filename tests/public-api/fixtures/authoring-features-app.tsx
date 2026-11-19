import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  DataValue,
  MetricWidget,
  Stack,
  TableWidget,
  TextContent,
  mountDataApp,
} from '@altertable/data-app-react';
import { parseCount, searchFilter } from '@altertable/data-app/contract';
import { formatMetric } from '@altertable/data-app/format';

/** Focused host fixture for snapshot-backed CSV export and presentation. */
export const dataApp = defineDataApp({
  title: 'Sample counts',
  description: 'A host-action fixture.',
  scope: { organization: 'test', environment: 'fixture' },
  queries: {
    authoringCountsByGroup: {
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
    authoringTotal: {
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

const groupName = searchFilter({ key: 'group', label: 'Group' });
const operations = dataApp.defineOperations({
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10, maxDurationMs: 15_000 },
    async run({ query }, { groupName }) {
      const result = await query('authoringCountsByGroup', { groupName });
      return result.rows.map(row => ({
        groupName: row.group_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  sampleTotal: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 1, maxDurationMs: 15_000 },
    async run({ query }, { groupName }) {
      const result = await query('authoringTotal', { groupName });
      const row = result.rows[0];
      return row ? { sampleCount: parseCount(row.sample_count) } : null;
    },
  }),
});
const queryNames = {
  ...operations.sampleCountsByGroup.queryNames,
  ...operations.sampleTotal.queryNames,
};
const context = createDataContext(queryNames)({
  description: 'Fixture values for host action coverage.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'Recorded samples in the selected group.',
      queryNames: [
        queryNames.authoringCountsByGroup,
        queryNames.authoringTotal,
      ],
    },
  },
});
const { defineView } = createDataHooks(operations.createDataClient());
const countsView = defineView({
  dataContext: context,
  operation: 'sampleCountsByGroup',
  isEmpty: counts => counts.length === 0,
  emptyFallback: { title: 'No matching groups' },
});
const totalView = defineView({
  dataContext: context,
  operation: 'sampleTotal',
  isEmpty: total => total === null,
  emptyFallback: { title: 'No total for this selection' },
});
const counts = countsView.dataset({
  name: 'Sample counts',
  select: value => value,
  rowKey: row => row.groupName,
  columns: {
    groupName: { label: 'Group', value: row => row.groupName },
    sampleCount: { value: row => row.sampleCount, format: { kind: 'count' } },
  },
  evidence: { id: 'counts', glossaryIds: ['sampleCount'] },
});
const total = totalView.metric(
  {
    id: 'total-samples',
    label: 'Total samples',
    glossaryId: 'sampleCount',
    format: { kind: 'count', compact: true },
  },
  value => {
    if (value === null) throw new Error('Total is unavailable.');
    return { current: value.sampleCount };
  }
);
const countsContent = countsView.content(source => (
  <Stack>
    <TextContent>
      <p>
        Showing <DataValue scope={source.scope} />
      </p>
    </TextContent>
    <TableWidget dataset={counts} source={source} title="Counts by group" />
  </Stack>
));
const totalContent = totalView.content(source => (
  <MetricWidget metric={total} source={source} />
));

function App() {
  return (
    <DataApp
      view={countsView}
      summaryViews={[totalView]}
      datasets={[counts]}
      story={(countsSnapshot, totalSnapshot) => {
        const value = total.read(totalSnapshot);
        const scope = countsView.scope(countsSnapshot);
        return [
          {
            id: 'total-samples',
            headline: `Total samples: ${formatMetric(value.value.current, total.definition.format)}`,
            context: `Demonstration values for ${scope}.`,
            visual: <MetricWidget metric={total} source={totalSnapshot} />,
            visualKind: 'metric',
            evidence: total,
          },
          {
            id: 'counts-by-group',
            headline: 'Counts by group',
            context: `Demonstration values for ${scope}.`,
            visual: <TableWidget dataset={counts} source={countsSnapshot} />,
            evidence: counts,
          },
        ];
      }}
    >
      <DataSection content={totalContent} label="Sample total" />
      <DataSection content={countsContent} label="Group counts" />
    </DataApp>
  );
}

mountDataApp({ app: dataApp, component: App });

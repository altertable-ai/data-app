import { formatMetric } from '@altertable/data-app/format';
import { createDataClient } from '@altertable/data-app/client';
import type { DataAppConfig } from '@altertable/data-app/config';
import {
  defineOperation,
  defineQueryNames,
  parseCount,
} from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  DataValue,
  TableWidget,
  Grid,
  Stack,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
  MetricWidget,
  searchVariable,
} from '@altertable/data-app/react';

const queryNames = defineQueryNames({
  sampleCountsByGroup: 'sample-counts-by-group',
});
function parseSampleCountFilter(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    !('groupName' in value) ||
    typeof value.groupName !== 'string' ||
    value.groupName.length > 40
  )
    throw new Error('Expected a group name of at most 40 characters.');
  return { groupName: value.groupName };
}
function parseSampleCounts(
  value: unknown
): { groupName: string; sampleCount: number }[] {
  if (!Array.isArray(value))
    throw new Error('Expected sample counts by group.');
  return value.map(row => {
    if (!row || typeof row !== 'object' || typeof row.groupName !== 'string')
      throw new Error('Expected a group name.');
    return {
      groupName: row.groupName,
      sampleCount: parseCount(row.sampleCount),
    };
  });
}
const operations = {
  sampleCountsByGroup: defineOperation({
    queryNames,
    input: parseSampleCountFilter,
    output: parseSampleCounts,
    checks: [
      { groupName: '' },
      { groupName: 'Alpha' },
      { groupName: 'missing' },
    ],
    policy: { maxQueryRows: 10, maxDurationMs: 15000, exposeSql: true },
    async run({ query }, { groupName }) {
      // Portable sample data, not a production table. Escape the validated SQL literal.
      const escapedGroupName = groupName.replaceAll("'", "''");
      const queryResult = await query(
        queryNames.sampleCountsByGroup,
        `
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 2200000), ('Beta', 0))
SELECT group_name, sample_count FROM sample_counts
WHERE '${escapedGroupName}' = '' OR group_name = '${escapedGroupName}'
ORDER BY group_name LIMIT 10`
      );
      return parseSampleCounts(
        queryResult.rows.map(([groupName, sampleCount]) => ({
          groupName,
          sampleCount,
        }))
      );
    },
  }),
};
const appConfig: DataAppConfig = {
  title: 'Sample counts',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
};
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
  variables: {
    groupName: searchVariable({
      key: 'group',
      label: 'Group',
      defaultValue: '',
    }),
  },
  describeInput: ({ groupName }) =>
    groupName ? `group ${groupName}` : 'all groups',
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
const totalSamples = sampleCountsView.metric(
  {
    id: 'total-samples',
    glossaryId: 'sampleCount',
    label: 'Total samples',
    format: { kind: 'count', compact: true },
  },
  rows => ({ current: rows.reduce((sum, row) => sum + row.sampleCount, 0) })
);
const sampleContent = sampleCountsView.content(result => (
  <Stack aria-label="Sample results">
    <TextContent>
      <p>
        Showing <DataValue scope={result.scope} />
      </p>
    </TextContent>
    <Grid columns={2}>
      <MetricWidget
        metric={totalSamples}
        source={result}
        description="Sum of the fixture counts in the selected groups."
      />
      <TableWidget
        dataset={sampleCounts}
        source={result}
        title="Counts by group"
        description="Alpha and Beta demonstrate measured values, including zero."
        pagination={false}
      />
    </Grid>
  </Stack>
));
function App() {
  return (
    <DataApp
      config={appConfig}
      view={sampleCountsView}
      datasets={[sampleCounts]}
      story={snapshot => {
        const total = totalSamples.read(snapshot);
        const scope = sampleCountsView.scope(snapshot);
        return [
          {
            id: 'total-samples',
            headline: `Total samples: ${formatMetric(total.value.current, totalSamples.definition.format)}`,
            context: `Demonstration values for ${scope}.`,
            visual: <MetricWidget metric={totalSamples} source={snapshot} />,
            visualKind: 'metric',
            evidence: totalSamples,
          },
          {
            id: 'counts-by-group',
            headline: 'Counts by group',
            context: `Demonstration values for ${scope}.`,
            visual: (
              <TableWidget
                dataset={sampleCounts}
                source={snapshot}
                pagination={false}
              />
            ),
            evidence: sampleCounts,
          },
        ];
      }}
    >
      <Stack>
        <TextContent>
          <h2>Sample counts</h2>
        </TextContent>
        <DataSection content={sampleContent} />
      </Stack>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: appConfig, component: App });

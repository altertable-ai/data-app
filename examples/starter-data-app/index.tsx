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
  injectDataAppStyles,
  mountDataApp,
  MetricWidget,
  textVariable,
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
WITH sample_counts(group_name, sample_count) AS (VALUES ('Alpha', 3), ('Beta', 0))
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
      definition: 'A fixture value: Alpha is 3 and Beta is a measured zero.',
      queryNames: [queryNames.sampleCountsByGroup],
    },
  },
});
const { defineDataView, useView } = createDataHooks(
  createDataClient({ operations })
);
const sampleCountsView = defineDataView({
  operation: 'sampleCountsByGroup',
  variables: {
    groupName: textVariable({ key: 'group', label: 'Group', defaultValue: '' }),
  },
  input: ({ groupName }) => ({ groupName }),
  describeInput: ({ groupName }) =>
    groupName ? `group ${groupName}` : 'all groups',
  isEmpty: sampleCounts => sampleCounts.length === 0,
  empty: {
    title: 'No matching groups',
    description: 'Try Alpha, Beta, or clear the group filter.',
  },
});
function App() {
  const sampleCountsRequest = useView(sampleCountsView);
  return (
    <DataApp
      config={appConfig}
      dataContext={sampleDataContext}
      request={sampleCountsRequest}
      story={
        sampleCountsRequest.snapshot?.data.length
          ? ({ data: sampleCounts, input: displayedInput }) =>
              sampleCounts.map(({ groupName, sampleCount }) =>
                sampleDataContext.finding({
                  id: `sample-count-${groupName}`,
                  headline: `${groupName} has ${sampleCount} samples`,
                  context: `Demonstration values for ${displayedInput.groupName || 'all groups'}.`,
                  visual: (
                    <MetricWidget
                      label="Sample count"
                      value={sampleCount}
                      format={{ kind: 'count' }}
                    />
                  ),
                  visualKind: 'metric',
                  evidence: {
                    id: `sample-count-${groupName}`,
                    glossaryIds: ['sampleCount'],
                  },
                })
              )
          : undefined
      }
    >
      {(sampleCounts, displayedInput) => (
        <section aria-label="Sample results">
          <h2>Sample counts</h2>
          <p>Showing {displayedInput.groupName || 'all groups'}</p>
          <ul>
            {sampleCounts.map(({ groupName, sampleCount }) => (
              <li key={groupName}>
                {groupName}: {sampleCount}
              </li>
            ))}
          </ul>
        </section>
      )}
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: appConfig, component: App });

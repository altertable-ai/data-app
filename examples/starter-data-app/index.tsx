import { createDataClient } from '@altertable/data-app/client';
import type { DataAppConfig } from '@altertable/data-app/config';
import {
  defineOperation,
  defineQueryNames,
  defineQueryVariables,
  parseQueryVariables,
  parseCount,
} from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  Grid,
  Stack,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
  MetricWidget,
  queryVariable,
} from '@altertable/data-app/react';

const queryNames = defineQueryNames({
  sampleCountsByGroup: 'sample-counts-by-group',
});
const queryVariables = defineQueryVariables([
  { name: 'groupName', nullable: false, type: 'STRING', default: '' },
]);
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
    variables: queryVariables,
    input: value => parseQueryVariables(queryVariables, value),
    output: parseSampleCounts,
    checks: [
      { groupName: '' },
      { groupName: 'Alpha' },
      { groupName: 'missing' },
    ],
    policy: { maxQueryRows: 10, maxDurationMs: 15000, exposeSql: true },
    async run({ query }, { groupName }) {
      const queryResult = await query(queryNames.sampleCountsByGroup, {
        groupName,
      });
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
    groupName: queryVariable(queryVariables[0], {
      key: 'group',
      label: 'Group',
    }),
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
      csvExport={({ data: sampleCounts, input }) => ({
        filename: `sample-counts-${input.groupName || 'all'}.csv`,
        tables: [
          {
            name: 'Sample counts',
            columns: ['Group', 'Sample count'],
            rows: sampleCounts.map(({ groupName, sampleCount }) => [
              groupName,
              sampleCount,
            ]),
          },
        ],
      })}
      story={({ data: sampleCounts, input: displayedInput }) =>
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
      }
    >
      {(sampleCounts, displayedInput) => (
        <Stack aria-label="Sample results">
          <TextContent>
            <h2>Sample counts</h2>
            <p>Showing {displayedInput.groupName || 'all groups'}</p>
          </TextContent>
          <Grid columns={2}>
            {sampleCounts.map(({ groupName, sampleCount }) => (
              <MetricWidget
                key={groupName}
                label={`${groupName}: ${sampleCount}`}
                value={sampleCount}
                format={{ kind: 'count' }}
              />
            ))}
          </Grid>
        </Stack>
      )}
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config: appConfig, component: App });

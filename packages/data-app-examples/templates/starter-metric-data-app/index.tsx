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
  choiceFilter,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';
import { createDataClient } from '@altertable/data-app/client';
import { parseCount } from '@altertable/data-app/contract';
const dataApp = defineDataApp({
  title: 'Sample metric',
  description: 'Fixture counts by group; replace with the requested metric.',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    sampleCountsBySegment: {
      projections: {
        segment_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT segment_name, sample_count FROM SEMANTIC_VIEW(
  starter_sample_counts DIMENSIONS samples.segment_name METRICS samples.sample_count
  WHERE $groupName = '' OR samples.group_name = $groupName
) ORDER BY segment_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
    sampleCountsByGroup: {
      projections: {
        group_name: { type: 'string' },
        sample_count: { type: 'number' },
      },
      statement: `
SELECT group_name, sample_count FROM SEMANTIC_VIEW(
  starter_sample_counts DIMENSIONS samples.group_name METRICS samples.sample_count
  WHERE $groupName = '' OR samples.group_name = $groupName
) ORDER BY group_name LIMIT $limit`,
      params: {
        groupName: { type: 'string', defaultValue: '' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
  },
});
function parseGroupFilter(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    !('groupName' in value) ||
    typeof value.groupName !== 'string' ||
    !['all', 'Alpha', 'Beta'].includes(value.groupName)
  )
    throw new Error('Expected a fixture group.');
  return { groupName: value.groupName };
}
/** The fixture queries read an empty group name as every group. */
function queryGroup(groupName: string) {
  return groupName === 'all' ? '' : groupName;
}
const operations = {
  sampleCountsByGroup: dataApp.defineOperation({
    input: parseGroupFilter,
    checks: [
      { groupName: 'all' },
      { groupName: 'Alpha' },
      { groupName: 'Beta' },
    ],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsByGroup', {
        groupName: queryGroup(groupName),
      });
      return queryResult.rows.map(
        (row): { groupName: 'Alpha' | 'Beta'; sampleCount: number } => {
          if (row.group_name !== 'Alpha' && row.group_name !== 'Beta')
            throw new Error('Unexpected fixture group.');
          return {
            groupName: row.group_name,
            sampleCount: parseCount(row.sample_count),
          };
        }
      );
    },
  }),
  sampleCountsBySegment: dataApp.defineOperation({
    input: parseGroupFilter,
    checks: [
      { groupName: 'all' },
      { groupName: 'Alpha' },
      { groupName: 'Beta' },
    ],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const queryResult = await query('sampleCountsBySegment', {
        groupName: queryGroup(groupName),
      });
      return queryResult.rows.map(row => ({
        segmentName: row.segment_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
};
const queryNames = {
  ...operations.sampleCountsByGroup.queryNames,
  ...operations.sampleCountsBySegment.queryNames,
};
const sampleDataContext = createDataContext(queryNames)({
  description:
    'The starter_sample_counts semantic view measures fictional samples by group and segment. Replace it with the requested semantic metric before publishing.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition: 'A fixture value: Alpha is 2,200,000 and Beta is 600,000.',
      queryNames: [
        queryNames.sampleCountsByGroup,
        queryNames.sampleCountsBySegment,
      ],
    },
  },
});
const { defineDataView, defineFilters } = createDataHooks(
  createDataClient({ operations })
);
// Declare filters once; each chart's view reads them, and <DataApp> renders their controls.
const filters = defineFilters({
  groupName: choiceFilter({
    key: 'group',
    label: 'Group',
    defaultValue: 'all',
    options: [
      { id: 'all', label: 'All groups' },
      { id: 'Alpha', label: 'Alpha' },
      { id: 'Beta', label: 'Beta' },
    ],
  }),
});
function describeGroup({ groupName }: { groupName: string }) {
  return groupName === 'all' ? 'all groups' : groupName;
}
const sampleCountsView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  filters,
  describeInput: describeGroup,
  isEmpty: rows => rows.length === 0,
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
const segmentCountsView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsBySegment',
  filters,
  describeInput: describeGroup,
  isEmpty: rows => rows.length === 0,
  emptyFallback: {
    title: 'No matching segments',
    description: 'No observations are available for this query.',
  },
});
const segmentCounts = segmentCountsView.dataset({
  name: 'Counts by segment',
  select: rows => rows,
  rowKey: row => row.segmentName,
  columns: {
    segmentName: { label: 'Segment', value: row => row.segmentName },
    sampleCount: { value: row => row.sampleCount, format: { kind: 'count' } },
  },
  evidence: { id: 'counts-by-segment', glossaryIds: ['sampleCount'] },
});
const groupActions = sampleCounts.actions(
  action => ({
    drill: action.filter({
      label: 'Drill into group',
      target: sampleCountsView.filter(),
      values: row => ({ groupName: row.groupName }),
    }),
  }),
  { primary: 'drill' }
);
// Keep only the breakdowns and interactions relevant to the requested metric.
const groupContent = sampleCountsView.content(result => (
  <VisualizationWidget
    dataset={sampleCounts}
    source={result}
    title="Sample count"
    description="Select a group to filter both charts; choose All groups to reset."
    actions={groupActions}
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
));
const segmentContent = segmentCountsView.content(result => (
  <VisualizationWidget
    dataset={segmentCounts}
    source={result}
    title="Samples by segment"
    description="Segment breakdown for the selected group scope."
  >
    {(rows, actions) => (
      <BarChart
        ariaLabel="Sample counts by segment"
        unit="samples"
        items={rows.map(row => ({
          ...row,
          id: row.segmentName,
          label: row.segmentName,
          value: row.sampleCount,
        }))}
        itemActions={actions}
      />
    )}
  </VisualizationWidget>
));
function App() {
  return (
    <DataApp view={sampleCountsView} filters={filters} showToolbar={false}>
      <Stack>
        <DataSection content={groupContent} label="Sample count" />
        <DataSection content={segmentContent} label="Samples by segment" />
      </Stack>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

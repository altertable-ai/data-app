import { defineDataApp } from '@altertable/data-app';
import { createDataContext, mountDataApp } from '@altertable/data-app-react';
import {
  createDataHooks,
  DataApp,
  DataSection,
  VisualizationWidget,
  Ranking,
  Grid,
  GridItem,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';
import { choiceFilter, parseCount } from '@altertable/data-app/contract';
import { formatCount } from '@altertable/data-app/format';
export const dataApp = defineDataApp({
  title: 'Sample metric',
  description: 'Explore sample volume across groups and segments.',
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
) ORDER BY sample_count DESC, segment_name LIMIT $limit`,
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
// Declare each filter once; operations list the filters they read, and views,
// controls, and scope derive from them.
const groupName = choiceFilter({
  key: 'group',
  label: 'Group',
  defaultValue: 'all',
  options: [
    { id: 'all', label: 'All groups' },
    { id: 'Alpha', label: 'Alpha' },
    { id: 'Beta', label: 'Beta' },
  ],
});
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
    filters: { groupName },
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
});
const queryNames = {
  ...operations.sampleCountsByGroup.queryNames,
  ...operations.sampleCountsBySegment.queryNames,
};
const sampleDataContext = createDataContext(queryNames)({
  description:
    'The starter_sample_counts semantic view measures fictional sample volume by group and segment. The source has no time dimension.',
  glossary: {
    sampleCount: {
      term: 'Sample count',
      definition:
        'Sum of recorded sample counts in the selected group scope. Additive across groups and segments.',
      queryNames: [
        queryNames.sampleCountsByGroup,
        queryNames.sampleCountsBySegment,
      ],
    },
  },
});
const { defineView } = createDataHooks(operations.createDataClient());
const sampleCountsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
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
const segmentCountsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsBySegment',
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
        horizontalGrid={false}
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
  >
    {rows => (
      <Ranking
        aria-label="Sample counts by segment"
        items={rows.map(row => ({
          id: row.segmentName,
          label: row.segmentName,
          value: row.sampleCount,
        }))}
      />
    )}
  </VisualizationWidget>
));
function App() {
  return (
    <DataApp view={sampleCountsView} showToolbar={false}>
      <Grid columns={3}>
        <GridItem span={2}>
          <DataSection content={groupContent} />
        </GridItem>
        <GridItem>
          <DataSection content={segmentContent} />
        </GridItem>
      </Grid>
    </DataApp>
  );
}
mountDataApp({ app: dataApp, component: App });

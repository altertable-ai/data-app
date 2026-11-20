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
import { formatCount } from '@altertable/data-app/format';

import { sampleDataContext } from '#app/data-context.ts';
import { operations } from '#app/operations.ts';
const { defineView } = createDataHooks(operations.createDataClient());
const sampleCountsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  emptyFallback: {
    title: 'No matching groups',
    description: 'No observations are available for this query.',
  },
});
const sampleCounts = sampleCountsView.dataset({
  name: 'Sample counts',
  rowKey: row => row.groupName,
  columns: {
    groupName: { label: 'Group' },
    sampleCount: { format: { kind: 'count' } },
  },
  evidence: {
    id: 'counts-by-group',
    glossaryIds: ['sampleCount'],
  },
});
const segmentCountsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsBySegment',
  emptyFallback: {
    title: 'No matching segments',
    description: 'No observations are available for this query.',
  },
});
const segmentCounts = segmentCountsView.dataset({
  name: 'Counts by segment',
  rowKey: row => row.segmentName,
  columns: {
    segmentName: { label: 'Segment' },
    sampleCount: { format: { kind: 'count' } },
  },
  evidence: { id: 'counts-by-segment', glossaryIds: ['sampleCount'] },
});
// Selecting a group applies the shared group filter to both charts.
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
export function App() {
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

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

import { sampleDataContext } from '#app/data-context.ts';
import type { operations } from '#app/operations.ts';
const { defineDataView, defineFilters } =
  createDataHooks(createDataClient<typeof operations>());
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
export function App() {
  return (
    <DataApp view={sampleCountsView} filters={filters} showToolbar={false}>
      <Stack>
        <DataSection content={groupContent} label="Sample count" />
        <DataSection content={segmentContent} label="Samples by segment" />
      </Stack>
    </DataApp>
  );
}

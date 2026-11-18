import {
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  GridItem,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  Stack,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';
import { formatCount } from '@altertable/data-app/format';

import { sampleDataContext } from '#app/data-context.ts';
import { operations } from '#app/operations.ts';

const { defineView } = createDataHooks(operations.createDataClient());
const sampleCountsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  isEmpty: sampleCounts => sampleCounts.length === 0,
  emptyFallback: {
    title: 'No matching groups',
    description: 'Choose another group or select All groups.',
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
const sampleTotalView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleTotal',
  isEmpty: total => total === null,
  emptyFallback: {
    title: 'No total for this selection',
    description: 'Choose a matching group to inspect its recorded samples.',
  },
});
const totalSamples = sampleTotalView.metric(
  {
    id: 'total-samples',
    glossaryId: 'sampleCount',
    label: 'Total samples',
    format: { kind: 'count', compact: true },
  },
  total => {
    if (total === null) throw new Error('No measured total in this selection.');
    return { current: total.sampleCount };
  }
);
const totalContent = sampleTotalView.content(result => (
  <MetricWidget metric={totalSamples} source={result} />
));
const groupActions = sampleCounts.actions(
  action => ({
    filter: action.filter({
      label: 'Filter to group',
      target: sampleCountsView.filter(),
      values: row => ({ groupName: row.groupName }),
    }),
  }),
  { primary: 'filter' }
);
const overviewContent = sampleCountsView.content(result => (
  <Grid columns={3}>
    <GridItem span={2}>
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
            itemActions={actions}
          />
        )}
      </VisualizationWidget>
    </GridItem>
    <GridItem>
      <Stack>
        <DataSection content={totalContent} label="Sample total" />
        <TableWidget
          dataset={sampleCounts}
          source={result}
          title="Counts by group"
          pagination={false}
        />
      </Stack>
    </GridItem>
  </Grid>
));
export function App() {
  return (
    <DataApp view={sampleCountsView} summaryViews={[sampleTotalView]}>
      <DataSection content={overviewContent} label="Sample overview" />
    </DataApp>
  );
}

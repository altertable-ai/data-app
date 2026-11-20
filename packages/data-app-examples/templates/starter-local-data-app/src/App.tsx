import {
  createDataHooks,
  DataApp,
  DataSection,
  VisualizationWidget,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';

import { dataContext } from '#app/data-context.ts';
import { operations } from '#app/operations.ts';

const { defineView } = createDataHooks(operations.createDataClient());
const sampleCountsView = defineView({
  dataContext,
  operation: 'sampleCountsByGroup',
  emptyFallback: {
    title: 'No matching groups',
    description: 'Choose another group.',
  },
});
const sampleCounts = sampleCountsView.dataset({
  name: 'Sample counts',
  rowKey: row => row.groupName,
  columns: {
    groupName: { label: 'Group' },
    sampleCount: { format: { kind: 'count' } },
  },
  evidence: { id: 'counts-by-group', glossaryIds: ['sampleCount'] },
});
const countsContent = sampleCountsView.content(result => (
  <VisualizationWidget
    dataset={sampleCounts}
    source={result}
    title="Samples by group"
  >
    {rows => (
      <BarChart
        ariaLabel="Sample counts by group"
        unit="samples"
        valueFormat={{ kind: 'count' }}
        showYAxis
        scrollToEnd={false}
        items={rows.map(row => ({
          id: row.groupName,
          label: row.groupName,
          value: row.sampleCount,
        }))}
      />
    )}
  </VisualizationWidget>
));

export function App() {
  return (
    <DataApp view={sampleCountsView} datasets={[sampleCounts]}>
      <DataSection content={countsContent} />
    </DataApp>
  );
}

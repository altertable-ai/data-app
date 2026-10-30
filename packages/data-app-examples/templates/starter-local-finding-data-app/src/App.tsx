import {
  createDataHooks,
  DataApp,
  DataSection,
  VisualizationWidget,
  DataValue,
  TableWidget,
  Ranking,
  Stack,
  TextContent,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';

import { sampleDataContext } from '#app/data-context.ts';
import type { operations } from '#app/operations.ts';
const { defineDataView } =
  createDataHooks(createDataClient<typeof operations>());
const sampleCountsView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  describeInput: () => 'fixture groups',
  isEmpty: sampleCounts => sampleCounts.length === 0,
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
const totalSamples = sampleCountsView.metric(
  {
    id: 'total-samples',
    label: 'Total samples',
    glossaryId: 'sampleCount',
    format: { kind: 'count' },
  },
  rows => ({ current: rows.reduce((sum, row) => sum + row.sampleCount, 0) })
);
const alphaSamples = sampleCountsView.metric(
  {
    id: 'alpha-samples',
    label: 'Alpha samples',
    glossaryId: 'sampleCount',
    format: { kind: 'count' },
  },
  rows => {
    const alpha = rows.find(row => row.groupName === 'Alpha');
    if (!alpha)
      throw new Error('The sample Finding requires evidence for Alpha.');
    return { current: alpha.sampleCount };
  }
);
// This fictional Finding demonstrates prose, inline evidence, and a Markdown-table equivalent.
// Preserve each real Finding's own headings and argument instead of reusing these sections.
const sampleContent = sampleCountsView.content(result => (
  <Stack>
    <TextContent>
      <h2>Contribution by group</h2>
      <p>
        <strong>Alpha</strong> contributed{' '}
        <DataValue metric={alphaSamples} source={result} /> of the{' '}
        <DataValue metric={totalSamples} source={result} /> recorded samples.
        The group comparison below supports that concentration; it does not
        explain its cause.
      </p>
    </TextContent>
    <VisualizationWidget
      dataset={sampleCounts}
      source={result}
      title="Sample count"
    >
      {rows => (
        <Ranking
          aria-label="Samples by group"
          items={rows.map(row => ({
            id: row.groupName,
            label: row.groupName,
            value: row.sampleCount,
          }))}
        />
      )}
    </VisualizationWidget>
    <TextContent>
      <h2>Supporting evidence</h2>
      <p>
        The source rows are grouped by <code>group_name</code> and summed using{' '}
        <code>sample_count</code>. The table retains the exact values behind the
        comparison.
      </p>
      <ul>
        <li>Compare the groups within the same sample population.</li>
        <li>
          <em>Volume alone does not establish performance or causality.</em>
        </li>
      </ul>
    </TextContent>
    <TableWidget
      dataset={sampleCounts}
      source={result}
      title="Counts by group"
      pagination={false}
    />
  </Stack>
));
export function App() {
  return (
    <DataApp view={sampleCountsView} showToolbar={false}>
      <DataSection content={sampleContent} />
    </DataApp>
  );
}

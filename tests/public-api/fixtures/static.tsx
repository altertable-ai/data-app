import { useState } from 'react';
import { formatPercent } from '@altertable/data-app/format';
import { mountDataApp, injectDataAppStyles } from '@altertable/data-app/react';
import {
  DataApp,
  MetricWidget,
  TableWidget,
  LineChart,
  PieChart,
} from '@altertable/data-app/react/ui';
const config = {
  title: 'Activity report',
  scope: { organization: 'test', environment: 'test' },
  appearance: {},
};
const rows = [
  { id: 'first', name: 'Café <table>', count: 1234 },
  { id: 'second', name: 'Measured zero', count: 0 },
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `row-${index}`,
    name: `Group ${index}`,
    count: index,
  })),
];
const counts = {
  name: 'Counts',
  columns: ['Name', 'Count'],
  rows: [
    ['München, "East"', 0],
    ['Two\nlines', null],
    ['=1+1', -10],
    [' +SUM(A1)', false],
    ['@SUM(A1)', true],
  ],
};
const summary = { name: 'Summary', columns: ['Total'], rows: [[0]] };
function App() {
  const [search, setSearch] = useState('');
  return (
    <DataApp
      config={config}
      dataContext={{ description: 'Activity data', glossary: {} }}
      csvExport={{
        filename: 'gallery',
        tables: new URLSearchParams(location.search).has('multiple-exports')
          ? [counts, summary]
          : [counts],
      }}
    >
      <MetricWidget
        label="Total events"
        value={12345}
        format={{ kind: 'count' }}
      />
      <MetricWidget
        label="Conversion"
        value={0.116}
        format={{ kind: 'ratio' }}
      />
      <MetricWidget label="No events" value={0} format={{ kind: 'count' }} />
      <MetricWidget label="Unavailable" content={formatPercent(null)} />
      <TableWidget
        title="Events by group"
        rows={rows}
        rowKey={row => row.id}
        columns={[
          { id: 'name', header: 'Name', cell: row => row.name },
          { id: 'count', header: 'Count', cell: row => row.count },
        ]}
        emptyFallback={{ title: 'No matching events' }}
        search={{
          label: 'Search groups',
          value: search,
          onChange: setSearch,
          attributes: [{ name: 'name', getter: row => row.name }],
        }}
      />
      <LineChart
        ariaLabel="Event trend"
        items={[
          { id: 'loss', label: 'Loss', value: -1 },
          { id: 'gain', label: 'Gain', value: 3 },
        ]}
        unit="events"
      />
      <PieChart
        ariaLabel="Event shares"
        items={[
          { id: 'alpha', label: 'Alpha', value: 3 },
          { id: 'beta', label: 'Beta', value: 1 },
        ]}
        unit="events"
      />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config, component: App });

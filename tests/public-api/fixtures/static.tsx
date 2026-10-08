import { defineDataApp } from '@altertable/data-app/config';
import { useState } from 'react';
import {
  formatPercent,
  formatNumber,
  formatCount,
  formatMetric,
  formatDateRange,
  pluralize,
} from '@altertable/data-app/format';
import { mountDataApp, injectDataAppStyles } from '@altertable/data-app/react';
import {
  DataApp,
  MetricWidget,
  TableWidget,
  LineChart,
  PieChart,
} from '@altertable/data-app/react/ui';
const dataApp = defineDataApp({
  title: 'Activity report',
  scope: { organization: 'test', environment: 'test' },
  appearance: {},
  queries: {},
});
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
const formatting = [
  ['Rounded number', formatNumber(12.345, { maximumFractionDigits: 2 })],
  ['Negative zero', formatNumber(-0)],
  ['Compact count', formatCount(12345, { compact: true })],
  ['Fractional count', formatCount(12.5)],
  ['Negative count', formatCount(-1)],
  ['Nonfinite value', formatNumber(Infinity)],
  ['Custom missing label', formatNumber(undefined, { missing: 'Unknown' })],
  ['Small ratio', formatPercent(0.0012)],
  ['Tiny positive ratio', formatPercent(0.00002)],
  ['Tiny negative ratio', formatPercent(-0.00002)],
  ['Measured zero ratio', formatPercent(0)],
  ['Currency', formatMetric(12.5, { kind: 'currency', currency: 'USD' })],
  ['Localized number', formatNumber(1234.5, { locale: 'de-DE' })],
  ['Same month', formatDateRange({ start: '2026-09-25', end: '2026-09-27' })],
  ['Cross month', formatDateRange({ start: '2026-08-30', end: '2026-09-28' })],
  ['Cross year', formatDateRange({ start: '2025-12-30', end: '2026-01-02' })],
  ['Single day', formatDateRange({ start: '2026-09-28', end: '2026-09-28' })],
  ['Singular label', `1 ${pluralize(1, 'event')}`],
  ['Plural label', `0 ${pluralize(0, 'event')}`],
].map(([sample, display]) => ({ sample: sample!, display: display! }));
function App() {
  const [search, setSearch] = useState('');
  return (
    <DataApp
      config={dataApp.config}
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
      <TableWidget
        title="Formatting reference"
        emptyFallback={{ title: 'No formatting examples' }}
        rows={formatting}
        rowKey={row => row.sample}
        pagination={false}
        columns={[
          { id: 'sample', header: 'Sample', cell: row => row.sample },
          { id: 'display', header: 'Display', cell: row => row.display },
        ]}
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
mountDataApp({ config: dataApp.config, component: App });

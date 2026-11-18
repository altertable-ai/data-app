import {
  AreaChart,
  BarChart,
  LineChart,
  ComposedChart,
  ScatterChart,
  RetentionChart,
  FunnelChart,
  injectDataAppStyles,
} from '@altertable/data-app-react/ui';
import { applyAppearance } from '@altertable/data-app/appearance';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

injectDataAppStyles();
const items = [0, 50, 100].map((value, index) => ({
  id: String(index),
  label: `Sample ${index}`,
  value,
}));
const currencyItems = [
  { id: 'compute', label: 'Compute', value: 7200 },
  { id: 'storage', label: 'Storage', value: 4800 },
  { id: 'logging', label: 'Logging', value: 0 },
];
const retention = [
  {
    id: 'cohort',
    label: 'Cohort',
    cohortSize: 100,
    points: [1, 0.7, 0.3].map((rate, offset) => ({
      offset,
      label: `Day ${offset}`,
      rate,
      retainedCount: rate * 100,
    })),
  },
];
function Example() {
  const [grid, setGrid] = useState(true);
  const [selectedService, setSelectedService] = useState('');
  const gridProps = grid ? {} : { horizontalGrid: false };
  return (
    <>
      <button onClick={() => setGrid(value => !value)}>Toggle grids</button>
      <button onClick={() => applyAppearance({ theme: 'dark' })}>
        Dark theme
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 24,
        }}
      >
        <BarChart
          {...gridProps}
          items={items}
          unit="requests"
          ariaLabel="Grid bar"
        />
        <div>
          <output aria-label="Selected service">{selectedService}</output>
          <BarChart
            {...gridProps}
            items={currencyItems}
            unit="USD"
            ariaLabel="Currency bar"
            scrollToEnd={false}
            showYAxis
            valueFormat={{ kind: 'currency', currency: 'USD' }}
            itemActions={item => [
              {
                id: 'inspect',
                label: 'Inspect',
                onSelect: () => setSelectedService(item.label),
              },
            ]}
          />
        </div>
        <BarChart
          {...gridProps}
          items={items}
          unit="requests"
          ariaLabel="Count value axis"
          showYAxis
          valueFormat={{ kind: 'count' }}
        />
        <BarChart
          {...gridProps}
          items={items.map(item => ({ ...item, value: item.value / 100 }))}
          unit="conversion"
          ariaLabel="Ratio value axis"
          showYAxis
          valueFormat={{ kind: 'ratio' }}
        />
        <LineChart
          {...gridProps}
          items={items}
          unit="requests"
          ariaLabel="Grid line"
        />
        <AreaChart
          {...gridProps}
          items={items}
          unit="requests"
          ariaLabel="Grid area"
        />
        <ComposedChart {...gridProps} data={items} ariaLabel="Grid composed">
          <ComposedChart.XAxis dataKey="label" />
          <ComposedChart.YAxis />
          <ComposedChart.Area dataKey="value" />
          <ComposedChart.Tooltip />
        </ComposedChart>
        <ScatterChart
          {...gridProps}
          items={items.map(item => ({ ...item, x: item.value, y: item.value }))}
          xLabel="Traffic"
          yLabel="Latency"
          xUnit="requests"
          yUnit="ms"
          ariaLabel="Grid scatter"
        />
        <RetentionChart
          {...gridProps}
          series={retention}
          unit="users"
          ariaLabel="Grid retention"
        />
        <FunnelChart
          {...gridProps}
          steps={items.map(item => ({ id: item.id, label: item.label }))}
          series={[{ id: 'visits', label: 'Visits', values: [100, 70, 30] }]}
          unit="users"
          ariaLabel="Grid funnel"
        />
        <ComposedChart data={items} ariaLabel="Authored grid">
          <ComposedChart.XAxis dataKey="label" />
          <ComposedChart.YAxis />
          <>
            <ComposedChart.CartesianGrid strokeDasharray="3 3" />
          </>
          <ComposedChart.Line dataKey="value" />
        </ComposedChart>
      </div>
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Example />);

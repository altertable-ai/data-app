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
          horizontalGrid={grid}
          items={items}
          unit="requests"
          ariaLabel="Grid bar"
        />
        <LineChart
          horizontalGrid={grid}
          items={items}
          unit="requests"
          ariaLabel="Grid line"
        />
        <AreaChart
          horizontalGrid={grid}
          items={items}
          unit="requests"
          ariaLabel="Grid area"
        />
        <ComposedChart
          horizontalGrid={grid}
          data={items}
          ariaLabel="Grid composed"
        >
          <ComposedChart.XAxis dataKey="label" />
          <ComposedChart.YAxis />
          <ComposedChart.Area dataKey="value" />
          <ComposedChart.Tooltip />
        </ComposedChart>
        <ScatterChart
          horizontalGrid={grid}
          items={items.map(item => ({ ...item, x: item.value, y: item.value }))}
          xLabel="Traffic"
          yLabel="Latency"
          xUnit="requests"
          yUnit="ms"
          ariaLabel="Grid scatter"
        />
        <RetentionChart
          horizontalGrid={grid}
          series={retention}
          unit="users"
          ariaLabel="Grid retention"
        />
        <FunnelChart
          horizontalGrid={grid}
          steps={items.map(item => ({ id: item.id, label: item.label }))}
          series={[{ id: 'visits', label: 'Visits', values: [100, 70, 30] }]}
          unit="users"
          ariaLabel="Grid funnel"
        />
        <ComposedChart horizontalGrid data={items} ariaLabel="Authored grid">
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

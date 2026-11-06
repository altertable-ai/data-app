import {
  BarChart,
  LineChart,
  AreaChart,
  ComposedChart,
  useChartCursorGroup,
  injectDataAppStyles,
  type ChartCursorGroup,
} from '@altertable/data-app-react/ui';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

injectDataAppStyles();
const items = [0, 1, 2].map(index => ({
  id: String(index),
  label: `Minute ${index}`,
  time: Date.UTC(2026, 0, 1, 12, index),
  value: 10 + index,
}));
const data = items.map(item => ({
  when: new Date(item.time).toISOString(),
  value: item.value,
}));

function Example() {
  const group = useChartCursorGroup();
  const independent = useChartCursorGroup();
  const [showSource, setShowSource] = useState(true);
  const [revision, setRevision] = useState(0);
  return (
    <>
      <button onClick={() => setShowSource(false)}>Remove source</button>
      <button onClick={() => setRevision(value => value + 1)}>
        Refresh dashboard {revision}
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 360px)',
          gap: 24,
        }}
      >
        <IndependentPeer cursorGroup={independent} />
        {showSource && (
          <BarChart
            cursorGroup={group}
            items={items}
            unit="requests"
            ariaLabel="Linked bar"
          />
        )}
        <LineChart
          cursorGroup={group}
          items={items}
          unit="requests"
          ariaLabel="Linked line"
        />
        <AreaChart
          cursorGroup={group}
          items={items}
          unit="requests"
          ariaLabel="Linked area"
        />
        <ComposedChart
          cursorGroup={group}
          data={data}
          ariaLabel="Linked composed"
          height={220}
        >
          <ComposedChart.XAxis dataKey="when" />
          <ComposedChart.YAxis />
          <ComposedChart.Line dataKey="value" />
          <ComposedChart.Tooltip />
        </ComposedChart>
        <LineChart items={items} unit="requests" ariaLabel="Opted out" />
        <ComposedChart
          cursorGroup={group}
          data={items}
          ariaLabel="Numeric composed"
          height={220}
        >
          <ComposedChart.XAxis
            xAxisId="date"
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={value =>
              String(new Date(Number(value)).getUTCMinutes())
            }
          />
          <ComposedChart.YAxis yAxisId="measure" />
          <ComposedChart.Area
            xAxisId="date"
            yAxisId="measure"
            dataKey="value"
          />
          <ComposedChart.Tooltip axisId="date" />
        </ComposedChart>
        <AreaChart
          cursorGroup={group}
          items={items.filter(item => item.id !== '1')}
          unit="requests"
          ariaLabel="Missing timestamp"
        />

        <BarChart
          cursorGroup={independent}
          items={items}
          unit="requests"
          ariaLabel="Independent group"
        />
      </div>

      <BarChart items={items} unit="requests" ariaLabel="Outside group" />
    </>
  );
}

function IndependentPeer({ cursorGroup }: { cursorGroup: ChartCursorGroup }) {
  return (
    <LineChart
      cursorGroup={cursorGroup}
      items={items}
      unit="requests"
      ariaLabel="Independent peer"
    />
  );
}
createRoot(document.getElementById('root')!).render(<Example />);

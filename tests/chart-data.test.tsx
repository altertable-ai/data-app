import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterChart,
} from '@altertable/data-app/react/ui';

test('direct chart composition validates dynamic items consistently', () => {
  const rows = [
    { id: 'a', label: 'A', value: 1 },
    { id: 'a', label: 'B', value: 2 },
  ];
  for (const Chart of [BarChart, LineChart, AreaChart, PieChart]) {
    expect(() =>
      renderToStaticMarkup(
        <Chart items={rows} unit="events" ariaLabel="Activity" />
      )
    ).toThrow('duplicate "a"');
  }
  expect(() =>
    renderToStaticMarkup(
      <ScatterChart
        items={rows.map(row => ({ ...row, x: row.value, y: 0 }))}
        xLabel="X"
        yLabel="Y"
        xUnit=""
        yUnit=""
        ariaLabel="Observations"
      />
    )
  ).toThrow('duplicate "a"');
});

test('chart components reject invalid values while allowing signed trends', () => {
  for (const Chart of [BarChart, LineChart, AreaChart, PieChart]) {
    for (const item of [
      { id: ' ', label: 'Blank', value: 1 },
      { id: 'a', label: 'A', value: NaN },
      { id: 'a', label: 'A', value: Infinity },
    ]) {
      expect(() =>
        renderToStaticMarkup(
          <Chart items={[item]} unit="events" ariaLabel="Activity" />
        )
      ).toThrow();
    }
  }
  const items = [{ id: 'a', label: 'Loss', value: -1 }];
  for (const Chart of [BarChart, PieChart])
    expect(() =>
      renderToStaticMarkup(
        <Chart items={items} unit="events" ariaLabel="Activity" />
      )
    ).toThrow('nonnegative');
  for (const Chart of [LineChart, AreaChart])
    expect(
      renderToStaticMarkup(
        <Chart items={items} unit="events" ariaLabel="Activity" />
      )
    ).toContain('Loss');
  expect(() =>
    renderToStaticMarkup(
      <ScatterChart
        items={[{ id: 'a', label: 'A', x: 1, y: Infinity }]}
        xLabel="X"
        yLabel="Y"
        xUnit=""
        yUnit=""
        ariaLabel="Observations"
      />
    )
  ).toThrow('finite');
});

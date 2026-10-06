import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  defineChartItems,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterChart,
  type ChartItem,
  type ChartKind,
} from '@altertable/data-app/react';

test('prepared query data retains its order and rejects invalid data before rendering', () => {
  const rows: ChartItem[] = [
    { id: 'b', label: 'B', value: 0 },
    { id: 'a', label: 'A', value: 2 },
  ];
  expect(defineChartItems('bar', rows)).toBe(rows);
  for (const kind of ['bar', 'line', 'area', 'pie'] as const) {
    for (const invalid of [
      [...rows, rows[0]],
      [{ id: ' ', label: 'Blank', value: 1 }],
      [{ id: 'x', label: 'Bad', value: NaN }],
      [{ id: 'x', label: 'Bad', value: Infinity }],
    ]) {
      expect(() => defineChartItems(kind, invalid)).toThrow();
    }
  }
  const negative: ChartItem[] = [{ id: 'loss', label: 'Loss', value: -1 }];
  expect(defineChartItems('line', negative)).toBe(negative);
  expect(defineChartItems('area', negative)).toBe(negative);
  expect(() => defineChartItems('bar', negative)).toThrow('nonnegative');
  expect(() => defineChartItems('pie', negative)).toThrow('nonnegative');
  expect(() =>
    defineChartItems('scatter', [{ id: 'a', label: 'A', x: 1, y: Infinity }])
  ).toThrow('finite');
});

test('direct chart composition validates dynamic items consistently', () => {
  const rows: ChartItem[] = [
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
  // A kind chosen at runtime still enforces its actual domain.
  const kind: ChartKind = 'bar';
  expect(() =>
    defineChartItems(kind, [
      { id: 'a', label: 'A', value: Number.NEGATIVE_INFINITY },
    ])
  ).toThrow('finite');
});

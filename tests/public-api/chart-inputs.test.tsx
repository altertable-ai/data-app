import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ScatterChart,
  type ScatterChartItem,
} from '@altertable/data-app/react/ui';

test('standalone charts preserve their item validation and empty-result contract', () => {
  for (const Chart of [BarChart, LineChart, AreaChart, PieChart]) {
    function render(
      items: readonly { id: string; label: string; value: number }[]
    ) {
      return renderToStaticMarkup(
        <Chart items={items} unit="ms" ariaLabel="Values" />
      );
    }
    expect(render([])).toContain('No data');
    expect(() =>
      render([
        { id: 'same', label: 'A', value: 1 },
        { id: 'same', label: 'B', value: 2 },
      ])
    ).toThrow(/unique/);
    expect(() => render([{ id: '', label: 'A', value: 1 }])).toThrow(
      /blank ID/
    );
    expect(() => render([{ id: 'a', label: 'A', value: NaN }])).toThrow(
      /finite/
    );
    if (Chart === BarChart || Chart === PieChart) {
      expect(() => render([{ id: 'a', label: 'A', value: -1 }])).toThrow(
        /nonnegative/
      );
    } else {
      expect(render([{ id: 'a', label: 'A', value: -1 }])).toContain(
        'A: -1 ms'
      );
    }
  }
});

test('scatter charts validate observation identities and both numeric coordinates', () => {
  function render(items: readonly ScatterChartItem[]) {
    return renderToStaticMarkup(
      <ScatterChart
        items={items}
        xLabel="Duration"
        yLabel="Revenue"
        xUnit="ms"
        yUnit="euros"
        ariaLabel="Revenue by duration"
      />
    );
  }
  const observation = { id: 'a', label: 'Account A', x: -5, y: 0 };
  expect(render([])).toContain('No data');
  expect(render([observation])).toContain(
    'Account A: Duration -5 ms, Revenue 0 euros'
  );
  expect(() => render([observation, observation])).toThrow(/unique/);
  expect(() => render([{ ...observation, id: '  ' }])).toThrow(/blank ID/);
  for (const coordinate of ['x', 'y'] as const) {
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(() => render([{ ...observation, [coordinate]: value }])).toThrow(
        /finite values for x and y/
      );
    }
  }
});

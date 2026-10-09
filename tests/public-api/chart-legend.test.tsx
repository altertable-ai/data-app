import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ChartLegend,
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
} from '@altertable/data-app/react/ui';

const items = [{ id: 'a', label: 'Requests', value: 12 }];

test('legends compose independently of chart type and have decorative markers', () => {
  const html = renderToStaticMarkup(
    <>
      <LineChart items={items} unit="ms" ariaLabel="Response time" />
      <ChartLegend aria-label="Measures">
        <ChartLegend.Item>
          <ChartLegend.Marker kind="line" color="var(--atbl-chart-2)" />
          <ChartLegend.Label>Response time (ms)</ChartLegend.Label>
        </ChartLegend.Item>
      </ChartLegend>
    </>
  );
  expect(html).toContain('aria-label="Measures"');
  expect(html).toContain('Response time (ms)');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('color:var(--atbl-chart-2)');
  expect(html.slice(html.indexOf('<ul'))).not.toContain('<button');
});

test('pie category legends use shared primitives and can be omitted', () => {
  function render(showLegend?: boolean) {
    return renderToStaticMarkup(
      <PieChart
        items={items}
        unit="requests"
        ariaLabel="Requests"
        showLegend={showLegend}
      />
    );
  }
  expect(render()).toContain('altertable-chart-legend');
  expect(render()).toContain('data-kind="square"');
  expect(render(false)).not.toContain('altertable-chart-legend');
  expect(render(false)).toContain('altertable-pie-slice');
});

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

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
import { Breakdown, Ranking } from '@altertable/data-app/react';

test('standalone charts reject invalid IDs and report unplottable values', () => {
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
    expect(render([{ id: 'a', label: 'A', value: NaN }])).toMatch(
      /role="alert".*requires finite values/
    );
    if (Chart === BarChart || Chart === PieChart) {
      expect(render([{ id: 'a', label: 'A', value: -1 }])).toMatch(
        /role="alert".*requires nonnegative values/
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
      expect(render([{ ...observation, [coordinate]: value }])).toMatch(
        /role="alert".*finite values for x and y/
      );
    }
  }
});

test('readings report unplottable values instead of throwing', () => {
  expect(
    renderToStaticMarkup(
      <Ranking items={[{ id: 'a', label: 'A', value: Infinity }]} />
    )
  ).toMatch(/role="alert".*finite and nonnegative/);
  expect(
    renderToStaticMarkup(
      <Breakdown total={1} items={[{ id: 'a', label: 'A', value: 2 }]} />
    )
  ).toMatch(/role="alert".*parts of the observed total/);
});

test('pie actions receive original rows even when domain fields match plot metadata', () => {
  const rows = [
    {
      id: 'zero',
      label: 'Zero',
      value: 0,
      path: '/zero',
      share: 42,
      color: 'domain-zero',
    },
    {
      id: 'a',
      label: 'Alpha',
      value: 3,
      path: '/alpha',
      share: 43,
      color: 'domain-alpha',
    },
    {
      id: 'b',
      label: 'Beta',
      value: 7,
      path: '/beta',
      share: 44,
      color: 'domain-beta',
    },
  ];
  for (const showLegend of [true, false]) {
    const received: (typeof rows)[number][] = [];
    renderToStaticMarkup(
      <PieChart
        items={rows}
        ariaLabel="Values"
        unit="orders"
        showLegend={showLegend}
        itemActions={row => {
          received.push(row);
          return [{ id: 'inspect', label: 'Inspect', onSelect() {} }];
        }}
      />
    );
    expect(received.length).toBeGreaterThan(0);
    for (const row of received)
      expect(row).toBe(rows.find(original => original.id === row.id));
  }
});

import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  useSvgId,
  FunnelChart,
  RetentionChart,
  JourneyChart,
  type FunnelChartProps,
  type RetentionChartProps,
  type JourneyChartProps,
} from '@altertable/data-app/react/ui';

const shared = {
  ariaLabel: 'Product analytics',
  unit: 'users',
  formatValue: (value: number) => value.toFixed(1),
  className: 'app-chart',
};
const funnel: FunnelChartProps = {
  ...shared,
  steps: [
    { id: 'a', label: 'Visit' },
    { id: 'b', label: 'Activate' },
  ],
  series: [{ id: 'all', label: 'All users', values: [100, 40] }],
};
const retention: RetentionChartProps = {
  ...shared,
  series: [
    {
      id: 'a',
      label: 'Sep 1',
      cohortSize: 100,
      points: [
        { offset: 0, label: 'Week 0', rate: 0, retainedCount: 0 },
        { offset: 1, label: 'Week 1', rate: null, retainedCount: null },
      ],
    },
    {
      id: 'b',
      label: 'Sep 8',
      cohortSize: 50,
      points: [
        { offset: 0, label: 'Week 0', rate: 0.4, retainedCount: 25 },
        {
          offset: 1,
          label: 'Week 1',
          rate: 0.8,
          retainedCount: 40,
          incomplete: true,
        },
      ],
    },
  ],
};
const journey: JourneyChartProps = {
  ...shared,
  paths: [
    {
      id: 'a',
      steps: [
        { event: 'Home', property: null },
        { event: 'Signup', property: null },
        { event: 'Home', property: null },
      ],
      count: 40,
      converted: true,
      truncated: false,
    },
    {
      id: 'b',
      steps: [
        { event: 'Home', property: null },
        { event: 'Docs', property: null },
      ],
      count: 60,
      converted: false,
      truncated: false,
    },
  ],
};

test('funnel preserves frontend conversion and previous-step drop-off for independent populations', () => {
  const html = renderToStaticMarkup(<FunnelChart {...funnel} />);
  expect(html).toContain(
    'All users: 40.0 users, 40% conversion, 60.0 dropped off'
  );
  expect(html).toContain('app-chart');
  const zero = renderToStaticMarkup(
    <FunnelChart
      {...funnel}
      series={[{ id: 'zero', label: 'Empty', values: [0, 0] }]}
    />
  );
  expect(zero).toContain('Empty: 0.0 users, — conversion');
  expect(zero).not.toMatch(/NaN|Infinity/);
  expect(
    renderToStaticMarkup(<FunnelChart {...funnel} series={[]} />)
  ).toContain('No data');
  for (const values of [
    [100],
    [100, -1],
    [100, NaN],
    [100, Infinity],
    [100, 101],
  ])
    expect(() =>
      renderToStaticMarkup(
        <FunnelChart
          {...funnel}
          series={[{ id: 'x', label: 'Invalid', values }]}
        />
      )
    ).toThrow();
  expect(() =>
    renderToStaticMarkup(
      <FunnelChart {...funnel} steps={[funnel.steps[0]!, funnel.steps[0]!]} />
    )
  ).toThrow(/unique/);
});

test('retention preserves query rates, counts, unobserved periods, and incomplete tails', () => {
  const html = renderToStaticMarkup(<RetentionChart {...retention} />);
  expect(html).toContain('Week 0: 0% · 0.0 / 100.0 users');
  expect(html).toContain('Week 1: Not observed');
  // Rates may use a survival definition; never silently derive a different rate from counts.
  expect(html).toContain('Week 0: 40% · 25.0 / 50.0 users');
  expect(html).toContain('Week 1: 80% · 40.0 / 50.0 users · Incomplete period');
  expect(
    renderToStaticMarkup(<RetentionChart {...retention} series={[]} />)
  ).toContain('No data');
  for (const point of [
    { offset: 0, label: 'Day 0', rate: 2, retainedCount: 1 },
    { offset: 0, label: 'Day 0', rate: 0, retainedCount: 101 },
    { offset: 0, label: 'Day 0', rate: null, retainedCount: 0 },
    { offset: -1, label: 'Day -1', rate: 0, retainedCount: 0 },
    { offset: 0, label: 'Day 0', rate: NaN, retainedCount: 0 },
  ])
    expect(() =>
      renderToStaticMarkup(
        <RetentionChart
          {...shared}
          series={[
            { id: 'x', label: 'Invalid', cohortSize: 100, points: [point] },
          ]}
        />
      )
    ).toThrow();
  expect(() =>
    renderToStaticMarkup(
      <RetentionChart
        {...retention}
        series={[retention.series[0]!, retention.series[0]!]}
      />
    )
  ).toThrow(/unique/);
});

test('journey starts with two prefix-aware steps and derives population counts and shares', () => {
  const html = renderToStaticMarkup(<JourneyChart {...journey} />);
  expect(html).toContain('Home, step 1, 100.0 users');
  expect(html).toContain('Signup, step 2, 40.0 users');
  expect(html).toContain('40%');
  expect(html).not.toContain('Home, step 3');
  expect(html).toContain('More after Signup, step 2');
  expect(
    renderToStaticMarkup(<JourneyChart {...journey} paths={[]} />)
  ).toContain('No data');
  const truncated = renderToStaticMarkup(
    <JourneyChart
      {...shared}
      paths={[
        {
          id: 'x',
          steps: [{ event: 'Start', property: null }],
          count: 0,
          converted: false,
          truncated: true,
        },
      ]}
    />
  );
  expect(truncated).toContain('Start, step 1, 0.0 users');
  expect(truncated).not.toMatch(/NaN|Infinity|Drop-off|More after/);
  for (const path of [
    { ...journey.paths[0]!, count: -1 },
    { ...journey.paths[0]!, count: Infinity },
    { ...journey.paths[0]!, steps: [] },
  ])
    expect(() =>
      renderToStaticMarkup(<JourneyChart {...journey} paths={[path]} />)
    ).toThrow();
  expect(() =>
    renderToStaticMarkup(
      <JourneyChart
        {...journey}
        paths={[journey.paths[0]!, journey.paths[0]!]}
      />
    )
  ).toThrow(/unique/);
});

test('SVG definition IDs are distinct and preserve different React identifier prefixes', () => {
  function Gradient() {
    const id = useSvgId();
    return (
      <svg>
        <defs>
          <linearGradient id={id} />
        </defs>
        <rect fill={`url(#${id})`} />
      </svg>
    );
  }
  const markup = renderToStaticMarkup(
    <>
      <Gradient />
      <Gradient />
    </>,
    { identifierPrefix: 'report: west' }
  );
  const ids = [...markup.matchAll(/id="([^"]+)"/g)].map(match => match[1]!);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  for (const id of ids) {
    expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
    expect(markup).toContain(`url(#${id})`);
  }
  expect(
    renderToStaticMarkup(<Gradient />, { identifierPrefix: 'report: west' })
  ).not.toBe(
    renderToStaticMarkup(<Gradient />, { identifierPrefix: 'reportwest' })
  );
});

test('journey terminal labels follow their conversion outcome', () => {
  for (const [converted, label] of [
    [true, 'Converted'],
    [false, 'Drop-off'],
    [null, 'End of path'],
  ] as const) {
    const html = renderToStaticMarkup(
      <JourneyChart
        {...shared}
        paths={[
          {
            id: 'start',
            steps: [{ event: 'Start', property: null }],
            count: 10,
            converted,
            truncated: false,
          },
        ]}
      />
    );
    expect(html).toContain(`${label}, step 2, 10.0 users`);
  }
});

import { useState, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { applyAppearance } from '@altertable/data-app/appearance';
import { Button, Stack } from '@altertable/data-app/react';
import {
  ComposedChart,
  VisualizationWidget,
  injectDataAppStyles,
} from '@altertable/data-app/react/ui';
import '@/tests/public-api/fixtures/date-axes.css';

injectDataAppStyles();
applyAppearance({ theme: 'light' });

type Row = {
  bucket: string | number | Date;
  current: number;
  previous: number;
};
function sample(buckets: (string | number | Date)[]): Row[] {
  return buckets.map((bucket, index) => ({
    bucket,
    current: Math.round(100 + index * 1.8 + Math.sin(index * 0.55) * 24),
    previous: Math.round(70 + index * 1.3 + Math.cos(index * 0.45) * 17),
  }));
}
function timestamps(
  start: string,
  count: number,
  interval: number,
  dateOnly = false
) {
  return Array.from({ length: count }, (_, index) => {
    const iso = new Date(Date.parse(start) + index * interval).toISOString();
    return dateOnly ? iso.slice(0, 10) : iso;
  });
}
type Example = {
  title: string;
  description: string;
  rows: Row[];
  axis?: ComponentProps<typeof ComposedChart.XAxis<Row>>;
};
const examples: Example[] = [
  {
    title: 'A year · monthly points',
    description: 'Nov 2025 – Oct 2026 · 12 points · year boundary',
    rows: sample(
      Array.from({ length: 12 }, (_, index) =>
        new Date(Date.UTC(2025, 10 + index, 1)).toISOString().slice(0, 10)
      )
    ),
  },
  {
    title: 'Six weeks · daily points',
    description:
      '15 Dec 2025 – 25 Jan 2026 · 42 points · month and year boundaries',
    rows: sample(timestamps('2025-12-15T00:00:00Z', 42, 86_400_000, true)),
  },
  {
    title: 'Two days · hourly points',
    description: '13–14 Oct 2026 · 48 points · midnight transitions',
    rows: sample(timestamps('2026-10-13T00:00:00Z', 48, 3_600_000)),
  },
  {
    title: '90 minutes · minute points',
    description: '14 Oct 2026, 09:30–11:00 UTC · 91 points · hour transitions',
    rows: sample(timestamps('2026-10-14T09:30:00Z', 91, 60_000)),
  },
  {
    title: 'Plan tiers · categorical axis',
    description: 'Ordered categories · 6 points · no dates or time scale',
    rows: sample([
      'Free',
      'Starter',
      'Team',
      'Business',
      'Enterprise',
      'Custom',
    ]),
  },
];

const edgeExamples: Example[] = [
  {
    title: 'Authored category accessor',
    description:
      'Custom category accessors and labels retain their authored contract.',
    rows: sample(['Starter', 'Team']),
    axis: {
      dataKey: row => `Tier: ${String(row.bucket)}`,
      tickFormatter: value => `[${value}]`,
    },
  },
  {
    title: 'UTC ticks with authored formatter',
    description: 'UTC conversion preserves authored tick labels and positions.',
    rows: sample(
      timestamps('2026-10-14T00:00:00Z', 3, 21_600_000).map(Date.parse)
    ),
    axis: {
      scale: 'utc',
      ticks: [
        Date.parse('2026-10-14T00:00:00Z'),
        Date.parse('2026-10-14T12:00:00Z'),
      ],
      interval: 0,
      tickFormatter: value => `Hour ${new Date(Number(value)).getUTCHours()}`,
    },
  },
  {
    title: 'UTC ticks with authored positions',
    description: 'Explicit UTC ticks retain exact default date labels.',
    rows: sample(
      timestamps('2026-10-14T00:00:00Z', 3, 21_600_000).map(Date.parse)
    ),
    axis: {
      scale: 'utc',
      ticks: [
        Date.parse('2026-10-14T00:00:00Z'),
        Date.parse('2026-10-14T06:00:00Z'),
        Date.parse('2026-10-14T12:00:00Z'),
      ],
      interval: 0,
    },
  },
  {
    title: 'One observed date',
    description: 'A single instant still has a useful time extent.',
    rows: sample(['2024-02-29']),
  },
  {
    title: 'Repeated instants',
    description: 'Duplicate timestamps retain their exact precision.',
    rows: sample(['2026-10-14T09:30:00.125Z', '2026-10-14T09:30:00.125Z']),
  },
  {
    title: 'Date observations',
    description: 'Date objects use the same temporal derivation.',
    rows: sample([
      new Date('2024-02-29T00:00:00Z'),
      new Date('2024-03-01T00:00:00Z'),
    ]),
  },
  {
    title: 'Mixed date and category',
    description: 'A partially temporal column remains categorical.',
    rows: sample(['2024-02-29', 'Unknown']),
  },
  {
    title: 'Twelve years · annual points',
    description: '2015–2026 · 12 points · year-only labels',
    rows: sample(Array.from({ length: 12 }, (_, i) => `${2015 + i}-01-01`)),
  },
  {
    title: 'Uneven observations · leap year',
    description: '27 Feb – 1 Apr 2024 · gaps must retain elapsed-time spacing',
    rows: sample([
      '2024-02-27',
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
      '2024-04-01',
    ]),
  },
  {
    title: 'One minute · seconds',
    description: '14 Oct 2026, 09:30–09:31 UTC · 2-second samples',
    rows: sample(timestamps('2026-10-14T09:30:00Z', 31, 2_000)),
  },
  {
    title: 'One second · milliseconds',
    description: '14 Oct 2026, 09:30 UTC · 50-millisecond samples',
    rows: sample(timestamps('2026-10-14T09:30:00Z', 21, 50)),
  },
  {
    title: 'Epoch milliseconds · explicit UTC',
    description: 'Numeric timestamps opt in using scale="utc"',
    rows: sample(
      timestamps('2026-10-14T00:00:00Z', 12, 3_600_000).map(Date.parse)
    ),
    axis: { scale: 'utc' },
  },
  {
    title: 'Date-like categories · explicit category',
    description:
      'Category override preserves the original labels and equal spacing',
    rows: sample(['2024-01-01', '2024-01-02', '2024-12-31']),
    axis: { type: 'category' },
  },
];

function DateAxisFixture() {
  const edges = new URLSearchParams(location.search).has('edge-cases');
  const [dark, setDark] = useState(false);
  return (
    <main className="date-axes">
      <Stack gap="lg">
        <Button
          onClick={() => {
            applyAppearance({ theme: dark ? 'light' : 'dark' });
            setDark(!dark);
          }}
        >
          {dark ? 'Light theme' : 'Dark theme'}
        </Button>
        <div className="date-axis-grid">
          {(edges ? edgeExamples : examples).map(example => (
            <VisualizationWidget
              key={example.title}
              title={example.title}
              description={example.description}
              visual={
                <ComposedChart data={example.rows} ariaLabel={example.title}>
                  <ComposedChart.XAxis<Row>
                    dataKey="bucket"
                    {...example.axis}
                  />
                  <ComposedChart.YAxis />
                  <ComposedChart.Tooltip />
                  <ComposedChart.Legend />
                  <ComposedChart.Line dataKey="current" name="Current" />
                  <ComposedChart.Line
                    dataKey="previous"
                    name="Comparison"
                    stroke="var(--atbl-chart-2)"
                  />
                </ComposedChart>
              }
            />
          ))}
        </div>
      </Stack>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<DateAxisFixture />);

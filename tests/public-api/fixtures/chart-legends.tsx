import { Button, Grid, GridItem, Stack } from '@altertable/data-app-react';
import {
  ChartLegend,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  FunnelChart,
  RetentionChart,
  JourneyChart,
  ComposedChart,
  VisualizationWidget,
  injectDataAppStyles,
} from '@altertable/data-app-react/ui';
import { applyAppearance } from '@altertable/data-app/appearance';
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Line as NativeLine } from 'recharts';

injectDataAppStyles();
applyAppearance(
  new URLSearchParams(location.search).has('palette')
    ? {
        theme: 'light',
        accentColor: '#cc5500',
        chartColors: ['#8040c0', '#208040'],
      }
    : { theme: 'light' }
);

const revenueAndConversion = [
  { month: 'Jan', revenue: 42, forecast: 40, conversion: 2.4 },
  { month: 'Feb', revenue: 48, forecast: 46, conversion: 2.7 },
  { month: 'Mar', revenue: 45, forecast: 52, conversion: 2.5 },
  { month: 'Apr', revenue: 62, forecast: 58, conversion: 3.1 },
  { month: 'May', revenue: 71, forecast: 64, conversion: 3.4 },
  { month: 'Jun', revenue: 78, forecast: 70, conversion: 3.8 },
];

const dailyResponseTime = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
  label => ({ label })
);

const serviceSeries = [
  'API',
  'Search',
  'Exports',
  'Ingestion',
  'Queries',
  'Auth',
  'Billing',
  'Notifications',
  'Workflows',
  'Webhooks',
  'Storage',
  'Analytics',
].map((name, index) => ({
  key: ['service', index].join(':'),
  name,
  label: `${name} — production workspaces in ${index % 2 === 0 ? 'Europe' : 'North America'} (ms)`,
  color: `var(--atbl-chart-${(index % 8) + 1})`,
}));
const serviceResponseTimes = dailyResponseTime.map((day, dayIndex) => ({
  day: day.label,
  ...Object.fromEntries(
    serviceSeries.map((series, index) => [
      series.key,
      65 + index * 18 + Math.round(Math.sin(dayIndex * 1.2 + index) * 24),
    ])
  ),
}));

function Example({
  name,
  description,
  children,
  span = 1,
}: {
  name: string;
  description: string;
  children: ReactNode;
  span?: 1 | 2;
}) {
  return (
    <GridItem span={span}>
      <section aria-label={`${name} basic example`}>
        <VisualizationWidget
          title={name}
          description={description}
          visual={children}
        />
      </section>
    </GridItem>
  );
}

const samples = [
  { id: 'mon', label: 'Mon', value: -4 },
  { id: 'tue', label: 'Tue', value: 0 },
  { id: 'wed', label: 'Wed', value: 8 },
  { id: 'thu', label: 'Thu', value: 3 },
  { id: 'fri', label: 'Fri', value: 6 },
  { id: 'sat', label: 'Sat', value: 2 },
  { id: 'sun', label: 'Sun', value: 5 },
];
function formatValue(value: number) {
  return value.toFixed(1);
}

function PieLegendExample() {
  const [showLegend, setShowLegend] = useState(true);
  return (
    <>
      <Button onClick={() => setShowLegend(value => !value)}>
        {showLegend ? 'Hide pie legend' : 'Show pie legend'}
      </Button>
      <PieChart
        items={samples
          .slice(0, 3)
          .map(item => ({ ...item, value: Math.abs(item.value) }))}
        unit="ms"
        ariaLabel="Standalone pie plot"
        showLegend={showLegend}
        formatValue={formatValue}
      />
    </>
  );
}

function RecentSamples() {
  const [count, setCount] = useState(20);
  const items = Array.from({ length: count }, (_, index) => ({
    id: String(index),
    label: `Sample ${index + 1}`,
    value: index + 1,
  }));
  return (
    <>
      <Button onClick={() => setCount(30)}>Load newer samples</Button>
      {[
        { Chart: BarChart, name: 'Recent bar' },
        { Chart: LineChart, name: 'Recent line' },
        { Chart: AreaChart, name: 'Recent area' },
      ].map(({ Chart, name }) => (
        <Chart key={name} items={items} unit="ms" ariaLabel={name} />
      ))}
    </>
  );
}

const legendRows = [
  { x: 0, alpha: 10, beta: 20 },
  { x: 1, alpha: 15, beta: 25 },
];
function alphaAccessor(row: (typeof legendRows)[number]) {
  return row.alpha;
}
function betaAccessor(row: (typeof legendRows)[number]) {
  return row.beta;
}
const legendKinds = [
  'line',
  'area',
  'bar',
  'scatter',
  'native-key',
  'native-accessor',
  'native-shared',
] as const;
type LegendKind = (typeof legendKinds)[number];

function LegendNote({ name }: { name: string }) {
  const [note, setNote] = useState('');
  return (
    <label>
      {name}
      <input
        aria-label={`${name} note`}
        value={note}
        onChange={event => setNote(event.target.value)}
      />
    </label>
  );
}
function LegendIdentityExample({ kind }: { kind: LegendKind }) {
  const [descending, setDescending] = useState(false);
  const [removeAlpha, setRemoveAlpha] = useState(false);
  const [renamed, setRenamed] = useState(false);
  const Series =
    kind === 'area'
      ? ComposedChart.Area
      : kind === 'bar'
        ? ComposedChart.Bar
        : kind === 'scatter'
          ? ComposedChart.Scatter
          : ComposedChart.Line;
  return (
    <>
      <Button onClick={() => setDescending(value => !value)}>
        Reverse legend
      </Button>
      <Button onClick={() => setRemoveAlpha(true)}>Remove Alpha</Button>
      <Button onClick={() => setRenamed(true)}>Rename Alpha</Button>
      <ComposedChart data={legendRows} ariaLabel={`${kind} identity plot`}>
        <ComposedChart.XAxis dataKey="x" type="number" />
        <ComposedChart.YAxis />
        {(['alpha', 'beta'] as const)
          .filter(key => !removeAlpha || key !== 'alpha')
          .map(key => {
            const name =
              key === 'alpha' ? (renamed ? 'First' : 'Alpha') : 'Beta';
            return kind.startsWith('native') ? (
              <NativeLine
                key={key}
                id={kind === 'native-shared' ? key : undefined}
                dataKey={
                  kind === 'native-accessor'
                    ? key === 'alpha'
                      ? alphaAccessor
                      : betaAccessor
                    : kind === 'native-shared'
                      ? 'alpha'
                      : key
                }
                name={name}
              />
            ) : (
              <Series key={key} dataKey={key} name={name} />
            );
          })}
        <ComposedChart.Tooltip />
        <ComposedChart.Legend
          itemSorter={entry =>
            descending
              ? entry.value === 'Beta'
                ? 0
                : 1
              : entry.value === 'Beta'
                ? 1
                : 0
          }
          formatter={name => <LegendNote name={String(name)} />}
        />
      </ComposedChart>
    </>
  );
}

// Keep large-series rendering cases out of the public gallery.
createRoot(document.getElementById('root')!).render(
  <Stack>
    <Button onClick={() => applyAppearance({ theme: 'dark' })}>
      Switch to dark theme
    </Button>
    <Grid columns={2} minItemWidth="wide">
      <Example
        name="Weekly cohort bars"
        description="Date bars reserve space at both ends of the time axis."
      >
        <ComposedChart
          ariaLabel="Weekly cohort bar plot"
          data={[
            { date: '2026-09-07', returning: 2000, fresh: 1200 },
            { date: '2026-09-14', returning: 1200, fresh: 1600 },
            { date: '2026-09-21', returning: 900, fresh: 800 },
            { date: '2026-09-28', returning: 400, fresh: 700 },
            { date: '2026-10-05', returning: 500, fresh: 600 },
            { date: '2026-10-12', returning: 200, fresh: 600 },
          ]}
        >
          <ComposedChart.XAxis dataKey="date" />
          <ComposedChart.YAxis ticks={[0, 800, 1600, 2400, 3200]} />
          <ComposedChart.Bar
            dataKey="returning"
            stackId="cohort"
            fill="#8040c0"
          />
          <ComposedChart.Bar dataKey="fresh" stackId="cohort" fill="#208040" />
          <ComposedChart.Tooltip />
        </ComposedChart>
      </Example>

      <Example
        name="Long currency labels"
        description="Axis labels reserve space for the complete formatted value."
      >
        <ComposedChart
          data={[
            { label: 'One', value: -100000 },
            { label: 'Two', value: 200000 },
          ]}
          ariaLabel="Long currency labels"
        >
          <ComposedChart.XAxis dataKey="label" />
          <ComposedChart.YAxis
            tickFormatter={value =>
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR',
              }).format(Number(value))
            }
          />
          <ComposedChart.Bar dataKey="value" />
        </ComposedChart>
      </Example>
      <Example
        name="Automatic currency"
        description="Measure semantics own presentation."
      >
        <ComposedChart
          ariaLabel="Automatic currency plot"
          valueFormat={{ kind: 'currency', currency: 'EUR' }}
          data={[
            { label: 'One', value: -52345.89 },
            { label: 'Two', value: 183456.78 },
          ]}
        >
          <ComposedChart.XAxis dataKey="label" />
          <ComposedChart.YAxis
            domain={[-100000, 200000]}
            ticks={[-100000, 0, 100000, 200000]}
          />
          <ComposedChart.Bar dataKey="value" name="Revenue" />
          <ComposedChart.Tooltip />
        </ComposedChart>
      </Example>
      {[
        {
          name: 'Close large ticks',
          ticks: [1000000, 1000100, 1000200],
          format: undefined,
        },
        {
          name: 'Small ratios',
          ticks: [0, 0.0001, 0.0002],
          format: { kind: 'ratio' as const },
        },
        {
          name: 'Fractional ticks',
          ticks: [0, 0.0001, 0.0002],
          format: undefined,
        },
        {
          name: 'German currency',
          ticks: [0, 1500, 3000],
          format: {
            kind: 'currency' as const,
            currency: 'EUR',
            locale: 'de-DE',
          },
        },
      ].map(({ name, ticks, format }) => (
        <Example
          key={name}
          name={name}
          description="Automatic numeric tick formatting"
        >
          <ComposedChart
            ariaLabel={`${name} plot`}
            valueFormat={format}
            data={ticks.map((value, index) => ({
              label: `Sample ${index + 1}`,
              value,
            }))}
          >
            <ComposedChart.XAxis dataKey="label" />
            <ComposedChart.YAxis
              ticks={ticks}
              domain={[ticks[0]!, ticks[ticks.length - 1]!]}
            />
            <ComposedChart.Line dataKey="value" />
          </ComposedChart>
        </Example>
      ))}
      <Example
        name="Recent samples"
        description="Latest displayed samples remain visible after updates."
      >
        <RecentSamples />
      </Example>
      <Example name="Hover defaults" description="Default chart inspection">
        <ComposedChart
          data={[
            { label: 'One', green: 1234.56789, purple: 2400.12345 },
            { label: 'Two', green: 1600.56789, purple: 2800.12345 },
          ]}
          ariaLabel="Hover bars"
        >
          <ComposedChart.XAxis dataKey="label" />
          <ComposedChart.YAxis />
          <ComposedChart.Bar
            dataKey="purple"
            name="Purple"
            fill="var(--atbl-chart-1)"
          />
          <ComposedChart.Bar
            dataKey="green"
            name="Green"
            fill="var(--atbl-chart-3)"
          />
          <ComposedChart.Tooltip />
        </ComposedChart>
        <ComposedChart
          data={[
            { label: 'One', green: 1234.56789, purple: 2400.12345 },
            { label: 'Two', green: 1600.56789, purple: 2800.12345 },
          ]}
          ariaLabel="Hover lines"
        >
          <ComposedChart.XAxis dataKey="label" />
          <ComposedChart.YAxis />
          <ComposedChart.Line
            dataKey="purple"
            name="Purple"
            stroke="var(--atbl-chart-1)"
          />
          <ComposedChart.Line
            dataKey="green"
            name="Green"
            stroke="var(--atbl-chart-3)"
          />
          <ComposedChart.Tooltip />
        </ComposedChart>
      </Example>
      {['lines', 'areas', 'single line'].map(kind => {
        const Series =
          kind === 'areas' ? ComposedChart.Area : ComposedChart.Line;
        return (
          <Example
            key={kind}
            name={`Inspection ${kind}`}
            description="Pointer inspection regression"
          >
            <ComposedChart
              ariaLabel={`Inspection ${kind}`}
              data={Array.from({ length: 12 }, (_, index) => ({
                label: `Sample ${index + 1}`,
                purple: 2400.12345 + index * 80,
                green: 1200.56789 + index * 40,
              }))}
            >
              <ComposedChart.XAxis dataKey="label" />
              <ComposedChart.YAxis />
              <ComposedChart.Tooltip />
              <Series dataKey="purple" name="Purple" />
              {kind !== 'single line' && (
                <Series
                  dataKey="green"
                  name="Green"
                  stroke="var(--atbl-chart-3)"
                />
              )}
            </ComposedChart>
          </Example>
        );
      })}
      {['Default stack', 'Rounded override', 'Unstacked bars'].map(name => (
        <Example key={name} name={name} description="Bar corner geometry">
          <ComposedChart
            ariaLabel={name}
            data={[
              { day: 'Mon', first: 8, second: 5 },
              { day: 'Tue', first: 6, second: null },
              { day: 'Wed', first: -4, second: -3 },
            ]}
          >
            <ComposedChart.XAxis dataKey="day" />
            <ComposedChart.YAxis />
            {['first', 'second'].map((key, index) => (
              <ComposedChart.Bar
                key={key}
                dataKey={key}
                fill={`var(--atbl-chart-${index + 1})`}
                stackId={name === 'Unstacked bars' ? undefined : 0}
                {...(name === 'Rounded override' ? { radius: 6 } : {})}
              />
            ))}
          </ComposedChart>
        </Example>
      ))}
      <Example
        name="ComposedChart"
        description="Revenue and forecast in €k on the left; conversion in % on the right."
        span={2}
      >
        <ComposedChart
          data={revenueAndConversion}
          ariaLabel="Monthly revenue, forecast, and conversion"
          margin={{ top: 12, right: 0, bottom: 0, left: 0 }}
        >
          <ComposedChart.ReferenceLine
            yAxisId="revenue"
            y={0}
            stroke="var(--atbl-border)"
          />
          <ComposedChart.XAxis dataKey="month" />
          <ComposedChart.YAxis yAxisId="revenue" width={42} unit="k" />
          <ComposedChart.YAxis
            yAxisId="conversion"
            orientation="right"
            width={42}
            unit="%"
            domain={[0, 5]}
          />
          <ComposedChart.Tooltip />
          <ComposedChart.Legend />
          <ComposedChart.Area
            dataKey="forecast"
            name="Forecast (€k)"
            yAxisId="revenue"
            stroke="var(--atbl-chart-2)"
          />
          <ComposedChart.Bar
            dataKey="revenue"
            name="Revenue (€k)"
            yAxisId="revenue"
          />
          <ComposedChart.Line
            dataKey="conversion"
            name="Conversion (%)"
            yAxisId="conversion"
            stroke="var(--atbl-chart-3)"
          />
        </ComposedChart>
      </Example>

      <Example
        name="LineChart — many series"
        description="Twelve services with an automatic legend. Inspect aligned columns and the overflow control."
      >
        <ComposedChart
          data={serviceResponseTimes}
          ariaLabel="Response time across twelve services"
          height={420}
        >
          <ComposedChart.XAxis dataKey="day" />
          <ComposedChart.YAxis width={48} unit="ms" />
          <ComposedChart.Tooltip />
          <ComposedChart.Legend />
          {serviceSeries.map(series => (
            <ComposedChart.Line
              key={series.key}
              dataKey={series.key}
              name={series.name}
              stroke={series.color}
              dot={false}
            />
          ))}
        </ComposedChart>
      </Example>
      <Example
        name="LineChart — long labels"
        description="Twelve series with longer labels and a separately composed legend below the plot."
      >
        <Stack gap="sm">
          <ComposedChart
            data={serviceResponseTimes}
            ariaLabel="Regional service response times"
          >
            <ComposedChart.XAxis dataKey="day" />
            <ComposedChart.YAxis width={48} unit="ms" />
            <ComposedChart.Tooltip />
            {serviceSeries.map(series => (
              <ComposedChart.Line
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
                dot={false}
              />
            ))}
          </ComposedChart>
          <ChartLegend aria-label="Regional services legend">
            {serviceSeries.map(series => (
              <ChartLegend.Item key={series.key}>
                <ChartLegend.Marker kind="square" color={series.color} />
                <ChartLegend.Label>{series.label}</ChartLegend.Label>
              </ChartLegend.Item>
            ))}
          </ChartLegend>
        </Stack>
      </Example>
      {[false, true].map(withActions => (
        <Example
          key={String(withActions)}
          name={`Long category bars ${withActions ? 'with actions' : 'plain'}`}
          description="Long category labels stay within their bar columns."
        >
          <BarChart
            ariaLabel={`Long category bars ${withActions ? 'with actions' : 'plain'}`}
            unit="people"
            items={[
              'B2B Preonboarding',
              'B2B Retention',
              'Business Development',
              'B2B Onboarding',
              'International After Sales',
              'B2BReactivationWithoutSpaces',
            ].map((label, index) => ({
              id: String(index),
              label,
              value: 60 - index * 8,
            }))}
            itemActions={
              withActions
                ? () => [
                    { id: 'inspect', label: 'Inspect', onSelect: () => {} },
                  ]
                : undefined
            }
          />
        </Example>
      ))}
      <Example
        name="Standalone bar"
        description="Original category input contract."
      >
        <BarChart
          items={samples.map(item => ({
            ...item,
            value: Math.abs(item.value),
          }))}
          unit="ms"
          ariaLabel="Standalone bar"
          formatValue={formatValue}
        />
      </Example>
      <Example
        name="Standalone line"
        description="Signed samples and measured zero."
      >
        <LineChart
          items={samples}
          unit="ms"
          ariaLabel="Standalone line"
          formatValue={formatValue}
        />
        <ChartLegend aria-label="Measures">
          <ChartLegend.Item>
            <ChartLegend.Marker kind="line" color="var(--atbl-chart-1)" />
            <ChartLegend.Label>Response time (ms)</ChartLegend.Label>
          </ChartLegend.Item>
        </ChartLegend>
      </Example>
      <Example
        name="Standalone area"
        description="Signed samples and measured zero."
      >
        <AreaChart
          items={samples}
          unit="ms"
          ariaLabel="Standalone area"
          formatValue={formatValue}
        />
      </Example>
      <Example
        name="Standalone pie"
        description="Original values and share inspection."
      >
        <PieLegendExample />
      </Example>

      <Example
        name="FunnelChart"
        description="Activation by plan. Filled columns show conversion; hatching shows drop-off from the previous step."
      >
        <FunnelChart
          ariaLabel="Activation funnel"
          unit="users"
          steps={[
            { id: 'visit', label: 'Visited' },
            { id: 'signup', label: 'Signed up' },
            { id: 'activate', label: 'Activated' },
          ]}
          series={[
            { id: 'free', label: 'Free plan', values: [1000, 600, 240] },
            { id: 'paid', label: 'Paid plan', values: [500, 400, 300] },
          ]}
        />
      </Example>
      <Example
        name="Funnel — many populations"
        description="Long labels and expandable series summaries."
      >
        <FunnelChart
          ariaLabel="Many populations funnel"
          unit="users"
          steps={[
            { id: 'entry', label: 'Started onboarding' },
            { id: 'end', label: 'Completed onboarding' },
          ]}
          series={Array.from({ length: 9 }, (_, index) => ({
            id: ['population', index].join(':'),
            label: `Population ${index + 1} — users assigned to the extended calendar experiment in Europe`,
            values: [1000 - index * 20, 250 - index * 10],
          }))}
        />
      </Example>
      <Example
        name="RetentionChart"
        description="Weekly return rates by signup cohort. Dotted tails mark periods still accumulating."
      >
        <RetentionChart
          ariaLabel="Weekly retention"
          unit="users"
          series={[
            {
              id: 'sep1',
              label: 'Sep 1',
              cohortSize: 100,
              points: [
                { offset: 0, label: 'Week 0', rate: 1, retainedCount: 100 },
                { offset: 1, label: 'Week 1', rate: 0.4, retainedCount: 40 },
                { offset: 2, label: 'Week 2', rate: 0, retainedCount: 0 },
                {
                  offset: 7,
                  label: 'Week 7',
                  rate: 0.2,
                  retainedCount: 20,
                  incomplete: true,
                },
              ],
            },
            {
              id: 'sep8',
              label: 'Sep 8',
              cohortSize: 80,
              points: [
                { offset: 0, label: 'Week 0', rate: 1, retainedCount: 80 },
                {
                  offset: 1,
                  label: 'Week 1',
                  rate: 0.6,
                  retainedCount: 48,
                  incomplete: true,
                },
                { offset: 2, label: 'Week 2', rate: null, retainedCount: null },
              ],
            },
          ]}
        />
      </Example>
      <Example
        name="JourneyChart"
        span={2}
        description="Explore onboarding paths one branch at a time. Counts and flows use the Step 1 population."
      >
        <JourneyChart
          ariaLabel="Onboarding journey"
          unit="users"
          paths={[
            {
              id: 'a',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Workspace created', property: null },
                { event: 'Report created', property: null },
                { event: 'Subscribed', property: null },
              ],
              count: 460,
              converted: true,
              truncated: false,
            },
            {
              id: 'b',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Workspace created', property: null },
                { event: 'Integration connected', property: null },
                { event: 'Subscribed', property: null },
              ],
              count: 240,
              converted: true,
              truncated: false,
            },
            {
              id: 'c',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Workspace created', property: null },
              ],
              count: 180,
              converted: false,
              truncated: false,
            },
            {
              id: 'd',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Documentation viewed', property: null },
                { event: 'Workspace created', property: null },
              ],
              count: 80,
              converted: null,
              truncated: true,
            },
            {
              id: 'e',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Documentation viewed', property: null },
              ],
              count: 40,
              converted: false,
              truncated: false,
            },
            {
              id: 'f',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Search', property: null },
                { event: 'Signed up', property: null },
              ],
              count: 30,
              converted: null,
              truncated: false,
            },
            {
              id: 'g',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Settings', property: null },
              ],
              count: 20,
              converted: null,
              truncated: true,
            },
            {
              id: 'h',
              steps: [
                { event: 'Signed up', property: null },
                { event: 'Invite sent', property: null },
              ],
              count: 10,
              converted: null,
              truncated: true,
            },
          ]}
        />
      </Example>
      {legendKinds.map(kind => (
        <Example
          key={kind}
          name={`${kind} legend identity`}
          description="Series retain their own notes when the legend changes."
        >
          <LegendIdentityExample kind={kind} />
        </Example>
      ))}
      <Example
        name="Sparse retention"
        description="Authored period labels and missing observations."
        span={2}
      >
        <RetentionChart
          ariaLabel="Sparse retention"
          unit="users"
          series={[
            {
              id: 'alpha',
              label: 'Alpha',
              cohortSize: 100,
              points: [
                {
                  offset: 11,
                  label: 'Cohort 2026 / week 11',
                  rate: 0.15,
                  retainedCount: 15,
                  incomplete: true,
                },
                {
                  offset: 0,
                  label: 'Cohort 2026 / week 0',
                  rate: 0.8,
                  retainedCount: 90,
                },
                {
                  offset: 7,
                  label: 'Cohort 2026 / week 7',
                  rate: 0,
                  retainedCount: 0,
                },
                {
                  offset: 2,
                  label: 'Cohort 2026 / week 2',
                  rate: null,
                  retainedCount: null,
                },
              ],
            },
            {
              id: 'beta',
              label: 'Beta',
              cohortSize: 50,
              points: [
                {
                  offset: 0,
                  label: 'Cohort 2026 / week 0',
                  rate: 1,
                  retainedCount: 50,
                },
                {
                  offset: 2,
                  label: 'Cohort 2026 / week 2',
                  rate: 0.4,
                  retainedCount: 20,
                },
                {
                  offset: 11,
                  label: 'Cohort 2026 / week 11',
                  rate: 0.2,
                  retainedCount: 10,
                  incomplete: true,
                },
              ],
            },
          ]}
        />
      </Example>
    </Grid>
  </Stack>
);

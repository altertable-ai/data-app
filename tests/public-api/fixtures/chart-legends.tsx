import { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyAppearance } from '@altertable/data-app/appearance';
import { Button, Grid, GridItem, Stack } from '@altertable/data-app/react';
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
} from '@altertable/data-app/react/ui';

injectDataAppStyles();
applyAppearance({ theme: 'light' });

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
  key: `service${index}`,
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

// Keep large-series rendering cases out of the public gallery.
createRoot(document.getElementById('root')!).render(
  <Stack>
    <Button onClick={() => applyAppearance({ theme: 'dark' })}>
      Switch to dark theme
    </Button>
    <Grid columns={2} minItemWidth="wide">
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
        <PieChart
          items={samples
            .slice(0, 3)
            .map(item => ({ ...item, value: Math.abs(item.value) }))}
          unit="ms"
          ariaLabel="Standalone pie"
          formatValue={formatValue}
        />
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
    </Grid>
  </Stack>
);

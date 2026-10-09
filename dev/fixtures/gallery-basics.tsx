import { type ReactNode } from 'react';
import { Comparison } from '@altertable/data-app/react';
import {
  BarChart,
  AreaChart,
  PieChart,
  FunnelChart,
  RetentionChart,
  JourneyChart,
  ScatterChart,
  ComposedChart,
} from '@altertable/data-app/react/ui';
import { DataTable, VisualizationWidget } from '@altertable/data-app/react/ui';
import {
  Breakdown,
  Grid,
  GridItem,
  Ranking,
  Stack,
  TextContent,
} from '@altertable/data-app/react';

const segments = [
  { id: 'product', label: 'Product', value: 45 },
  { id: 'services', label: 'Services', value: 35 },
  { id: 'other', label: 'Other', value: 20 },
];
const days = [
  { id: 'mon', label: 'Monday', value: 12 },
  { id: 'tue', label: 'Tuesday', value: 8 },
  { id: 'wed', label: 'Wednesday', value: 16 },
];

const ordersByChannel = [
  { id: 'web', label: 'Web', value: 84 },
  { id: 'app', label: 'App', value: 112 },
  { id: 'store', label: 'Store', value: 67 },
  { id: 'email', label: 'Email', value: 38 },
  { id: 'social', label: 'Social', value: 52 },
  { id: 'partner', label: 'Partner', value: 29 },
];
const dailyResponseTime = [
  { id: 'mon', label: 'Mon', value: 180 },
  { id: 'tue', label: 'Tue', value: 165 },
  { id: 'wed', label: 'Wed', value: 210 },
  { id: 'thu', label: 'Thu', value: 192 },
  { id: 'fri', label: 'Fri', value: 155 },
  { id: 'sat', label: 'Sat', value: 142 },
  { id: 'sun', label: 'Sun', value: 150 },
];
const monthlyStorage = [
  { id: 'jan', label: 'Jan', value: 120 },
  { id: 'feb', label: 'Feb', value: 155 },
  { id: 'mar', label: 'Mar', value: 148 },
  { id: 'apr', label: 'Apr', value: 205 },
  { id: 'may', label: 'May', value: 260 },
  { id: 'jun', label: 'Jun', value: 310 },
];

const trafficSources = [
  { id: 'direct', label: 'Direct', value: 4000 },
  { id: 'organic', label: 'Organic search', value: 3200 },
  { id: 'referral', label: 'Referral', value: 1800 },
  { id: 'social', label: 'Social', value: 1000 },
];

const revenueAndConversion = [
  { month: 'Jan', revenue: 42, forecast: 40, conversion: 2.4 },
  { month: 'Feb', revenue: 48, forecast: 46, conversion: 2.7 },
  { month: 'Mar', revenue: 45, forecast: 52, conversion: 2.5 },
  { month: 'Apr', revenue: 62, forecast: 58, conversion: 3.1 },
  { month: 'May', revenue: 71, forecast: 64, conversion: 3.4 },
  { month: 'Jun', revenue: 78, forecast: 70, conversion: 3.8 },
];

const serviceSeries = ['API', 'Search', 'Exports'].map((name, index) => ({
  key: `service${index}`,
  name,
  dots: name !== 'Search',
  color: `var(--atbl-chart-${index + 1})`,
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

const workspaces = [
  { id: 'atlas', label: 'Atlas', x: 120, y: 145 },
  { id: 'birch', label: 'Birch', x: 240, y: 160 },
  { id: 'cedar', label: 'Cedar', x: 310, y: 130 },
  { id: 'delta', label: 'Delta', x: 450, y: 195 },
  { id: 'elm', label: 'Elm', x: 520, y: 180 },
  { id: 'fern', label: 'Fern', x: 610, y: 225 },
  { id: 'grove', label: 'Grove', x: 680, y: 170 },
  { id: 'harbor', label: 'Harbor', x: 760, y: 260 },
  { id: 'iris', label: 'Iris', x: 850, y: 235 },
  { id: 'juniper', label: 'Juniper', x: 920, y: 310 },
  { id: 'kite', label: 'Kite', x: 400, y: 350 },
  { id: 'linden', label: 'Linden', x: 1050, y: 280 },
];

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

/** One ready example per composable data display, inside the shared visualization frame. */
export function GalleryBasics() {
  return (
    <Stack>
      <section aria-label="Charts">
        <Stack>
          <TextContent>
            <h2>Charts</h2>
            <p>
              Compare categories, follow trends, and explore shares of a whole.
            </p>
          </TextContent>
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
              name="BarChart"
              description="Orders by sales channel. Compare six distinct categories."
            >
              <BarChart
                items={ordersByChannel}
                unit="orders"
                ariaLabel="Orders by sales channel"
              />
            </Example>
            <Example
              name="LineChart"
              description="Daily response time across three services over one week."
            >
              <ComposedChart
                data={serviceResponseTimes}
                ariaLabel="Response time across three services"
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
                    dot={series.dots}
                  />
                ))}
              </ComposedChart>
            </Example>
            <Example
              name="AreaChart"
              description="Storage used over six months. See how total volume grows."
            >
              <AreaChart
                items={monthlyStorage}
                unit="GB"
                ariaLabel="Monthly storage used"
              />
            </Example>
            <Example
              name="PieChart"
              description="Website visits by source. Explore each channel’s share of total traffic."
            >
              <PieChart
                items={trafficSources}
                unit="visits"
                ariaLabel="Traffic by source"
              />
            </Example>
            <Example
              name="ScatterChart"
              span={2}
              description="Request volume versus response time across 12 workspaces. Spot relationships and outliers."
            >
              <ScatterChart
                items={workspaces}
                xLabel="Request volume"
                yLabel="Response time"
                xUnit="requests"
                yUnit="ms"
                ariaLabel="Workspace performance"
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
              description="Users returning each week after signup. Illustrative cohorts as of Oct 9; dotted tails mark the current partial week."
            >
              <RetentionChart
                ariaLabel="Weekly signup retention"
                unit="users"
                series={[
                  {
                    id: 'sep7',
                    label: 'Sep 7 signups',
                    cohortSize: 1000,
                    points: [
                      {
                        offset: 0,
                        label: 'Week 0',
                        rate: 1,
                        retainedCount: 1000,
                      },
                      {
                        offset: 1,
                        label: 'Week 1',
                        rate: 0.47,
                        retainedCount: 470,
                      },
                      {
                        offset: 2,
                        label: 'Week 2',
                        rate: 0.39,
                        retainedCount: 390,
                      },
                      {
                        offset: 3,
                        label: 'Week 3',
                        rate: 0.34,
                        retainedCount: 340,
                      },
                      {
                        offset: 4,
                        label: 'Week 4',
                        rate: 0.31,
                        retainedCount: 310,
                        incomplete: true,
                      },
                    ],
                  },
                  {
                    id: 'sep14',
                    label: 'Sep 14 signups',
                    cohortSize: 800,
                    points: [
                      {
                        offset: 0,
                        label: 'Week 0',
                        rate: 1,
                        retainedCount: 800,
                      },
                      {
                        offset: 1,
                        label: 'Week 1',
                        rate: 0.5,
                        retainedCount: 400,
                      },
                      {
                        offset: 2,
                        label: 'Week 2',
                        rate: 0.43,
                        retainedCount: 344,
                      },
                      {
                        offset: 3,
                        label: 'Week 3',
                        rate: 0.38,
                        retainedCount: 304,
                        incomplete: true,
                      },
                      {
                        offset: 4,
                        label: 'Week 4',
                        rate: null,
                        retainedCount: null,
                      },
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
      </section>
      <section aria-label="Custom visualizations">
        <Stack>
          <TextContent>
            <h2>Custom visualizations</h2>
            <p>Purpose-built comparisons, rankings, breakdowns, and tables.</p>
          </TextContent>
          <Grid columns={2} minItemWidth="wide">
            <Example
              name="Comparison"
              description="Compare one metric across two periods."
            >
              <Comparison
                label="Recorded events"
                current={{ value: 120, formattedValue: '120' }}
                previous={{ value: 100, formattedValue: '100' }}
              />
            </Example>
            <Example
              name="Ranking"
              description="Compare ordered values; bars scale to the largest item."
            >
              <Ranking items={segments} />
            </Example>
            <Example
              name="Breakdown"
              description="Show mutually exclusive shares of an explicit total."
            >
              <Breakdown total={100} items={segments} />
            </Example>
            <Example
              name="DataTable"
              description="Compose a table directly when you need custom headers and cells."
            >
              <DataTable>
                <thead>
                  <tr>
                    <th scope="col">Day</th>
                    <th scope="col" data-type="number">
                      Events
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => (
                    <tr key={day.id}>
                      <th scope="row">{day.label}</th>
                      <td data-type="number">{day.value}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </Example>
          </Grid>
        </Stack>
      </section>
    </Stack>
  );
}

import { type ReactNode } from 'react';
import {
  Breakdown,
  Comparison,
  DataTable,
  Grid,
  GridItem,
  Ranking,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterChart,
  Stack,
  TextContent,
  VisualizationWidget,
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
              description="Daily response time over one week. Spot spikes and improvements."
            >
              <LineChart
                items={dailyResponseTime}
                unit="ms"
                ariaLabel="Daily response time"
              />
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

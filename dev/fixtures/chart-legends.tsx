import { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyAppearance } from '@altertable/data-app/appearance';
import { Button, Grid, GridItem, Stack } from '@altertable/data-app/react';
import {
  ChartLegend,
  ComposedChart,
  VisualizationWidget,
  injectDataAppStyles,
} from '@altertable/data-app/react/ui';

injectDataAppStyles();
applyAppearance({ theme: 'light' });

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

// Keep large-series rendering cases out of the public gallery.
createRoot(document.getElementById('root')!).render(
  <Stack>
    <Button onClick={() => applyAppearance({ theme: 'dark' })}>
      Switch to dark theme
    </Button>
    <Grid columns={2} minItemWidth="wide">
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
                <ChartLegend.Marker kind="line" color={series.color} />
                <ChartLegend.Label>{series.label}</ChartLegend.Label>
              </ChartLegend.Item>
            ))}
          </ChartLegend>
        </Stack>
      </Example>
    </Grid>
  </Stack>
);

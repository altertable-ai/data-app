import { Button, Grid, GridItem, Stack } from '@altertable/data-app-react';
import {
  ChartLegend,
  ComposedChart,
  VisualizationWidget,
  injectDataAppStyles,
} from '@altertable/data-app-react/ui';
import { applyAppearance } from '@altertable/data-app/appearance';
import { KEY_SEPARATOR } from '@altertable/data-app/internal';
import { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

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
  key: ['service', index].join(KEY_SEPARATOR),
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

      {(['compact', 'full'] as const).map(format => (
        <Example
          key={format}
          name={
            format === 'compact'
              ? 'Revenue — compact axis'
              : 'Revenue — full axis'
          }
          description="The same revenue data. Hover or use the arrow keys for exact amounts."
        >
          <ComposedChart
            data={[
              { label: 'Sep 8', value: 183456.78 },
              { label: 'Sep 9', value: 112345.67 },
              { label: 'Sep 10', value: 76432.1 },
              { label: 'Sep 11', value: -52345.89 },
              { label: 'Sep 12', value: 34210.56 },
            ]}
            ariaLabel={`Revenue with ${format} currency ticks`}
            valueFormat={{ kind: 'currency', currency: 'EUR' }}
          >
            <ComposedChart.XAxis dataKey="label" />
            <ComposedChart.YAxis
              domain={[-100000, 200000]}
              ticks={[-100000, 0, 100000, 200000]}
              {...(format === 'full'
                ? {
                    tickFormatter: (value: unknown) =>
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(Number(value)),
                  }
                : {})}
            />
            <ComposedChart.Tooltip />
            <ComposedChart.Bar dataKey="value" name="Revenue" />
          </ComposedChart>
        </Example>
      ))}
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
    </Grid>
  </Stack>
);

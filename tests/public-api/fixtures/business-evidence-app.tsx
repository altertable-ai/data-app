import {
  Button,
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  DataValue,
  Grid,
  MetricWidget,
  mountDataApp,
  Stack,
  TableWidget,
  TextContent,
  VisualizationWidget,
} from '@altertable/data-app-react';
import {
  BarChart,
  ComposedChart,
  useAppFilters,
} from '@altertable/data-app-react/ui';
import { installLocalQueryLakehouse } from '@altertable/data-app/client';
import { formatPercent } from '@altertable/data-app/format';

import {
  dataApp,
  categoricalFindingOperations,
  rateFindingOperations,
  temporalMetricOperations,
  nonAdditiveMetricOperations,
  findingPeriod,
  segment,
  groupName,
} from '@/tests/public-api/fixtures/business-evidence';

const count = { kind: 'count' } as const;
const ratio = { kind: 'ratio' } as const;
const money = { kind: 'currency', currency: 'USD' } as const;
const context = createDataContext({
  businessTotals: 'businessTotals',
  businessBySegment: 'businessBySegment',
  businessRevenueByDay: 'businessRevenueByDay',
  sampleCountsByGroup: 'sampleCountsByGroup',
})({
  description:
    'Fictional, SQL-backed business evidence with unequal populations.',
  glossary: {
    conversion: {
      term: 'Conversion',
      definition: 'Conversions divided by visits in the same scope.',
      queryNames: ['businessTotals', 'businessBySegment'],
    },
    revenue: {
      term: 'Revenue',
      definition: 'Additive revenue in USD.',
      queryNames: ['businessRevenueByDay'],
    },
    mean: {
      term: 'Average order value',
      definition:
        'Revenue divided by orders, never an average of segment averages.',
      queryNames: ['businessTotals', 'businessBySegment'],
    },
    samples: {
      term: 'Samples',
      definition:
        'Categorical sample counts. The source has no time dimension.',
      queryNames: ['sampleCountsByGroup'],
    },
  },
});
const rateView = createDataHooks(
  rateFindingOperations.createDataClient()
).defineView({
  operation: 'conversion',
  dataContext: context,
  isEmpty: data => data.current === null,
  emptyFallback: {
    title: 'No conversion data in this period',
    description: 'Choose a period with measured visits and conversions.',
  },
});
const conversion = rateView.metric(
  { id: 'conversion', glossaryId: 'conversion', format: ratio },
  data => {
    if (!data.current) throw new Error('Conversion data is unavailable.');
    return {
      current: data.current.rate,
      ...(data.previous && { previous: data.previous.rate }),
    };
  }
);
const rateAudit = rateView.dataset({
  name: 'Conversion evidence',
  select: data =>
    data.current
      ? [
          { period: 'Current', ...data.current },
          ...(data.previous ? [{ period: 'Previous', ...data.previous }] : []),
        ]
      : [],
  rowKey: row => row.period,
  columns: {
    period: { label: 'Period', value: row => row.period },
    conversions: {
      label: 'Conversions',
      value: row => row.conversions,
      format: count,
    },
    visits: { label: 'Visits', value: row => row.visits, format: count },
    rate: { label: 'Conversion', value: row => row.rate, format: ratio },
  },
  evidence: { id: 'conversion-evidence', glossaryIds: ['conversion'] },
});
const segmentRates = rateView.dataset({
  name: 'Conversion by segment',
  select: data => data.rows,
  rowKey: row => row.segment,
  columns: {
    segment: { label: 'Segment', value: row => row.segment },
    rate: { label: 'Conversion', value: row => row.rate, format: ratio },
  },
  evidence: { id: 'segment-rates', glossaryIds: ['conversion'] },
});
const rateContent = rateView.content(result => (
  <Stack>
    <TextContent>
      <p>
        <output aria-label="Conversion change">
          <DataValue metric={conversion} source={result}>
            {values =>
              values.previous == null
                ? formatPercent(values.current)
                : `${formatPercent(values.current)} vs ${formatPercent(values.previous)}: ${((values.current - values.previous) * 100).toFixed(0)} percentage points`
            }
          </DataValue>
        </output>
      </p>
    </TextContent>
    {!result.loading && result.data.comparisonUnavailable && (
      <TextContent>
        <p>
          <output>Comparison unavailable for the selected period.</output>
        </p>
      </TextContent>
    )}
    <Grid columns={2}>
      <MetricWidget
        metric={conversion}
        source={result}
        description={
          <>
            Showing <DataValue scope={result.scope} />.
          </>
        }
      />
      <VisualizationWidget
        dataset={segmentRates}
        source={result}
        description={
          <>
            Showing <DataValue scope={result.scope} />.
          </>
        }
      >
        {rows => (
          <BarChart
            ariaLabel="Conversion by segment"
            unit="conversion"
            formatValue={formatPercent}
            items={rows.map(row => ({
              id: row.segment,
              label: row.segment,
              value: row.rate,
            }))}
          />
        )}
      </VisualizationWidget>
    </Grid>
    <TableWidget dataset={rateAudit} source={result} />
  </Stack>
));
function RateFinding() {
  const filters = useAppFilters({ period: findingPeriod, segment });
  const changed =
    !findingPeriod.same(filters.values.period, findingPeriod.defaultValue) ||
    !segment.same(filters.values.segment, segment.defaultValue);
  return (
    <DataApp view={rateView} showToolbar={false}>
      <Stack>
        <TextContent>
          <p>Finding scope: Mar 9–15, 2026 UTC · all segments.</p>
          {changed && (
            <p>
              <output>Exploration: scope changed</output>
            </p>
          )}
          <Button size="compact" onClick={() => filters.resetAll()}>
            Back to finding
          </Button>
        </TextContent>
        <DataSection content={rateContent} />
      </Stack>
    </DataApp>
  );
}
const categoryView = createDataHooks(
  categoricalFindingOperations.createDataClient()
).defineView({ operation: 'distribution', dataContext: context });
const categoryCounts = categoryView.dataset({
  name: 'Samples by group',
  select: rows => rows,
  rowKey: row => row.group,
  columns: {
    group: { label: 'Group', value: row => row.group },
    samples: { label: 'Samples', value: row => row.samples, format: count },
  },
  evidence: { id: 'categorical-finding', glossaryIds: ['samples'] },
});
const categoryContent = categoryView.content(result => (
  <VisualizationWidget
    dataset={categoryCounts}
    source={result}
    description={
      <>
        Showing <DataValue scope={result.scope} />. This source has no time
        dimension.
      </>
    }
  >
    {rows => (
      <BarChart
        ariaLabel="Sample distribution"
        unit="samples"
        items={rows.map(row => ({
          id: row.group,
          label: row.group,
          value: row.samples,
        }))}
      />
    )}
  </VisualizationWidget>
));
function CategoricalFinding() {
  const filters = useAppFilters({ groupName });
  return (
    <DataApp view={categoryView} showToolbar={false}>
      <Stack>
        <TextContent>
          <p>Finding: Alpha holds most samples. Original scope: all groups.</p>
          {!groupName.same(
            filters.values.groupName,
            groupName.defaultValue
          ) && (
            <p>
              <output>Exploration: scope changed</output>
            </p>
          )}
          <Button size="compact" onClick={() => filters.resetAll()}>
            Back to finding
          </Button>
        </TextContent>
        <DataSection content={categoryContent} />
      </Stack>
    </DataApp>
  );
}
const revenueView = createDataHooks(
  temporalMetricOperations.createDataClient()
).defineView({ operation: 'revenue', dataContext: context });
const dailyRevenue = revenueView.dataset({
  name: 'Revenue over time',
  select: rows => rows,
  rowKey: row => row.day,
  columns: {
    day: { label: 'Day', value: row => row.day },
    revenue: { label: 'Revenue', value: row => row.revenue, format: money },
  },
  evidence: { id: 'daily-revenue', glossaryIds: ['revenue'] },
});
const revenueContent = revenueView.content(result => (
  <Stack>
    <VisualizationWidget
      dataset={dailyRevenue}
      source={result}
      description={
        <>
          Showing <DataValue scope={result.scope} />.
        </>
      }
    >
      {rows => (
        <ComposedChart
          ariaLabel="Revenue over time"
          data={rows}
          valueFormat={money}
        >
          <ComposedChart.XAxis dataKey="day" />
          <ComposedChart.YAxis />
          <ComposedChart.Line dataKey="revenue" name="Revenue" />
          <ComposedChart.Tooltip />
        </ComposedChart>
      )}
    </VisualizationWidget>
    <TableWidget
      dataset={dailyRevenue}
      source={result}
      title="Daily revenue evidence"
    />
  </Stack>
));
function TemporalMetric() {
  return (
    <DataApp view={revenueView} showToolbar={false}>
      <DataSection content={revenueContent} />
    </DataApp>
  );
}
const efficiencyView = createDataHooks(
  nonAdditiveMetricOperations.createDataClient()
).defineView({ operation: 'efficiency', dataContext: context });
const rate = efficiencyView.metric(
  { id: 'overall-rate', glossaryId: 'conversion', format: ratio },
  data => ({ current: data.total.rate })
);
const mean = efficiencyView.metric(
  { id: 'overall-mean', glossaryId: 'mean', format: money },
  data => ({ current: data.total.mean })
);
const efficiency = efficiencyView.dataset({
  name: 'Efficiency evidence',
  select: data => [
    { segment: 'All selected segments', ...data.total },
    ...data.rows,
  ],
  rowKey: row => row.segment,
  columns: {
    segment: { label: 'Segment', value: row => row.segment },
    conversions: {
      label: 'Conversions',
      value: row => row.conversions,
      format: count,
    },
    visits: { label: 'Visits', value: row => row.visits, format: count },
    rate: { label: 'Conversion', value: row => row.rate, format: ratio },
    revenue: { label: 'Revenue', value: row => row.revenue, format: money },
    orders: { label: 'Orders', value: row => row.orders, format: count },
    mean: {
      label: 'Average order value',
      value: row => row.mean,
      format: money,
    },
  },
  evidence: { id: 'efficiency', glossaryIds: ['conversion', 'mean'] },
});
const efficiencyContent = efficiencyView.content(result => (
  <Stack>
    <TextContent>
      <p>
        Showing <DataValue scope={result.scope} />.
      </p>
    </TextContent>
    <Grid columns={2}>
      <MetricWidget metric={rate} source={result} />
      <MetricWidget metric={mean} source={result} />
    </Grid>
    <TableWidget dataset={efficiency} source={result} />
  </Stack>
));
function NonAdditiveMetric() {
  return (
    <DataApp view={efficiencyView} showToolbar={false}>
      <DataSection content={efficiencyContent} />
    </DataApp>
  );
}
if (typeof document !== 'undefined') {
  installLocalQueryLakehouse();
  const scenario = new URLSearchParams(location.search).get('scenario');
  const component =
    scenario === 'categorical-finding'
      ? CategoricalFinding
      : scenario === 'temporal-metric'
        ? TemporalMetric
        : scenario === 'non-additive-metric'
          ? NonAdditiveMetric
          : RateFinding;
  mountDataApp({ app: dataApp, component });
}

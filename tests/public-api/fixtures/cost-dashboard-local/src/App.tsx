import {
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  Stack,
} from '@altertable/data-app-react';
import { BarChart, ComposedChart } from '@altertable/data-app-react/ui';
import { formatDateRange } from '@altertable/data-app/format';

import { costDataContext } from '@/tests/public-api/fixtures/cost-dashboard-local/src/data-context';
import { month } from '@/tests/public-api/fixtures/cost-dashboard-local/src/filters';
import { operations } from '@/tests/public-api/fixtures/cost-dashboard-local/src/operations';

// Fictional charges use USD. Match this format to the real billing currency.
const costFormat = { kind: 'currency', currency: 'USD' } as const;
const { defineView, defineDetailView } = createDataHooks(
  operations.createDataClient()
);
const emptyFallback = {
  title: 'No allocations',
  description: 'Choose another month or customer.',
};
const servicesView = defineView({
  dataContext: costDataContext,
  operation: 'costBreakdown',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const serviceCosts = servicesView.dataset({
  name: 'Cost breakdown',
  select: rows => rows,
  rowKey: row => row.memberName,
  columns: {
    memberName: { label: 'Member', value: row => row.memberName },
    cost: { label: 'Cost', value: row => row.cost, format: costFormat },
  },
  evidence: { id: 'cost-breakdown', glossaryIds: ['allocatedCost'] },
});
const totalView = defineView({
  dataContext: costDataContext,
  operation: 'totalCost',
  isEmpty: total => total === null,
  emptyFallback: { title: 'No total available' },
});
const totalCost = totalView.metric(
  {
    id: 'total-cost',
    glossaryId: 'allocatedCost',
    label: 'Total cost',
    format: costFormat,
  },
  total => {
    if (total === null)
      throw new Error('No allocated total for this selection.');
    return { current: total.cost };
  }
);
const customerCount = totalView.metric(
  {
    id: 'customer-count',
    glossaryId: 'customerCount',
    label: 'Customers',
    format: { kind: 'count' },
  },
  total => {
    if (total === null)
      throw new Error('No customer count for this selection.');
    return { current: total.customerCount };
  }
);
const averageCost = totalView.metric(
  {
    id: 'average-cost',
    glossaryId: 'averageCustomerCost',
    label: 'Average per customer',
    format: costFormat,
  },
  total => {
    if (total === null) throw new Error('No average cost for this selection.');
    return { current: total.averageCost };
  }
);
const totalContent = totalView.content(result => (
  <Grid columns={3}>
    <MetricWidget metric={totalCost} source={result} />
    <MetricWidget metric={customerCount} source={result} />
    <MetricWidget metric={averageCost} source={result} />
  </Grid>
));
const customersView = defineDetailView({
  id: 'service-customers',
  title: 'Customer costs',
  operation: 'costsByCustomer',
  dataContext: costDataContext,
  parseInput: operations.costsByCustomer.input,
  describeInput: input =>
    `${input.serviceName} · ${month.describe?.(input.month)} · USD`,
  isEmpty: rows => rows.length === 0,
  emptyFallback: {
    title: 'No customer allocations',
    description:
      'No allocations are recorded for this service in the selected month and customer scope.',
  },
});
const customerCosts = customersView.dataset({
  name: 'Customer allocations',
  select: rows => rows,
  rowKey: row => row.customerName,
  columns: {
    customerName: { label: 'Customer', value: row => row.customerName },
    cost: { label: 'Cost', value: row => row.cost, format: costFormat },
  },
  evidence: { id: 'costs-by-customer', glossaryIds: ['allocatedCost'] },
});
const customersDetail = customersView.content(result => (
  <TableWidget
    dataset={customerCosts}
    source={result}
    title="Cost by customer"
    pagination={false}
  />
));
const serviceActions = serviceCosts.actions(
  action => ({
    customers: action.detail({
      label: 'View customers',
      target: customersView,
      when: row => row.dimension === 'service',
      input: row => ({ serviceName: row.memberName }),
    }),
  }),
  { primary: 'customers' }
);
const breakdownContent = servicesView.content(result => {
  const byService = result.loading || result.input.breakdown === 'service';
  return (
    <VisualizationWidget
      dataset={serviceCosts}
      source={result}
      title={byService ? 'Cost by service' : 'Cost by customer'}
      actions={serviceActions}
      breakdown={servicesView.breakdown('breakdown')}
    >
      {(rows, actions) => (
        <BarChart
          ariaLabel={byService ? 'Costs by service' : 'Costs by customer'}
          unit="USD"
          showYAxis
          scrollToEnd={false}
          valueFormat={costFormat}
          items={rows.map(row => ({
            ...row,
            id: row.memberName,
            label: row.memberName,
            value: row.cost,
          }))}
          itemActions={actions}
        />
      )}
    </VisualizationWidget>
  );
});
const trendView = defineView({
  dataContext: costDataContext,
  operation: 'costTrend',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const weeklyCosts = trendView.dataset({
  name: 'Weekly allocations',
  select: rows => rows,
  rowKey: row => row.periodStart,
  columns: {
    periodStart: { label: 'Allocation date', value: row => row.periodStart },
    cost: { label: 'Cost', value: row => row.cost, format: costFormat },
  },
  evidence: { id: 'cost-trend', glossaryIds: ['allocatedCost'] },
});
const trendContent = trendView.content(result => (
  <VisualizationWidget
    dataset={weeklyCosts}
    source={result}
    title="Weekly allocated cost"
  >
    {rows => (
      <ComposedChart
        data={rows}
        ariaLabel="Costs over time"
        valueFormat={costFormat}
      >
        <ComposedChart.XAxis
          dataKey="periodStart"
          tickFormatter={value =>
            formatDateRange({ start: String(value), end: String(value) })
          }
        />
        <ComposedChart.YAxis domain={[0, 'auto']} />
        <ComposedChart.Tooltip />
        <ComposedChart.Line dataKey="cost" name="Allocated cost" />
      </ComposedChart>
    )}
  </VisualizationWidget>
));
const mixView = defineView({
  dataContext: costDataContext,
  operation: 'customerServiceMix',
  isEmpty: rows => rows.length === 0,
  emptyFallback,
});
const customerMix = mixView.dataset({
  name: 'Customer service mix',
  select: rows => rows,
  rowKey: row => row.customerName,
  columns: {
    customerName: { label: 'Customer', value: row => row.customerName },
    Compute: { value: row => row.Compute, format: costFormat },
    Storage: { value: row => row.Storage, format: costFormat },
    Networking: { value: row => row.Networking, format: costFormat },
    Logging: { value: row => row.Logging, format: costFormat },
  },
  evidence: { id: 'customer-service-mix', glossaryIds: ['allocatedCost'] },
});
const mixContent = mixView.content(result => (
  <VisualizationWidget
    dataset={customerMix}
    source={result}
    title="Service mix by customer"
  >
    {rows => (
      <ComposedChart
        data={rows}
        ariaLabel="Service mix by customer"
        valueFormat={costFormat}
      >
        <ComposedChart.XAxis dataKey="customerName" />
        <ComposedChart.YAxis domain={[0, 'auto']} />
        <ComposedChart.Tooltip />
        <ComposedChart.Legend />
        {/* These service keys must match the columns returned by customerServiceMix. */}
        <ComposedChart.Bar dataKey="Compute" name="Compute" stackId="cost" />
        <ComposedChart.Bar
          dataKey="Storage"
          name="Storage"
          stackId="cost"
          fill="var(--atbl-chart-2)"
        />
        <ComposedChart.Bar
          dataKey="Networking"
          name="Networking"
          stackId="cost"
          fill="var(--atbl-chart-3)"
        />
        <ComposedChart.Bar
          dataKey="Logging"
          name="Logging"
          stackId="cost"
          fill="var(--atbl-chart-4)"
        />
      </ComposedChart>
    )}
  </VisualizationWidget>
));
export function App() {
  return (
    <DataApp view={servicesView} details={[customersDetail]}>
      <Stack>
        <DataSection content={totalContent} label="Cost summary" />
        <Grid columns={2}>
          <DataSection content={trendContent} label="Cost trend" />
          <DataSection content={breakdownContent} label="Cost overview" />
        </Grid>
        <DataSection content={mixContent} label="Customer composition" />
      </Stack>
    </DataApp>
  );
}

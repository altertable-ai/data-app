import {
  createDataHooks,
  DataApp,
  DataSection,
  Grid,
  GridItem,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  Stack,
  TextContent,
} from '@altertable/data-app-react';
import { BarChart } from '@altertable/data-app-react/ui';
import { formatMetric } from '@altertable/data-app/format';

import { costDataContext } from '#app/data-context.ts';
import { operations } from '#app/operations.ts';

const costFormat = { kind: 'currency', currency: 'USD' } as const;
const { defineView, defineDetailView } = createDataHooks(
  operations.createDataClient()
);
const servicesView = defineView({
  dataContext: costDataContext,
  operation: 'costsByService',
  isEmpty: rows => rows.length === 0,
  emptyFallback: {
    title: 'No service costs',
    description: 'No allocations are available for this period.',
  },
});
const serviceCosts = servicesView.dataset({
  name: 'Service costs',
  select: rows => rows,
  rowKey: row => row.serviceName,
  columns: {
    serviceName: { label: 'Service', value: row => row.serviceName },
    cost: {
      label: 'Cost',
      value: row => row.cost,
      format: costFormat,
    },
  },
  evidence: { id: 'costs-by-service', glossaryIds: ['allocatedCost'] },
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
    if (total === null) throw new Error('No allocated total for this period.');
    return { current: total.cost };
  }
);
const totalContent = totalView.content(result => (
  <MetricWidget metric={totalCost} source={result} />
));
const customersView = defineDetailView({
  id: 'service-customers',
  title: 'Customer costs',
  operation: 'costsByCustomer',
  dataContext: costDataContext,
  parseInput: operations.costsByCustomer.input,
  describeInput: ({ serviceName }) => `${serviceName} · September 2026 · USD`,
  isEmpty: rows => rows.length === 0,
  emptyFallback: {
    title: 'No customer allocations',
    description:
      'No allocations are recorded for this service in September 2026.',
  },
});
const customerCosts = customersView.dataset({
  name: 'Customer allocations',
  select: rows => rows,
  rowKey: row => row.customerName,
  columns: {
    customerName: { label: 'Customer', value: row => row.customerName },
    cost: {
      label: 'Cost',
      value: row => row.cost,
      format: costFormat,
    },
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
      input: row => ({ serviceName: row.serviceName }),
    }),
  }),
  { primary: 'customers' }
);
const overviewContent = servicesView.content(result => (
  <Grid columns={3}>
    <GridItem span={2}>
      <VisualizationWidget
        dataset={serviceCosts}
        source={result}
        title="Cost by service"
        actions={serviceActions}
      >
        {(rows, actions) => (
          <BarChart
            ariaLabel="Costs by service"
            unit="USD"
            formatValue={value => formatMetric(value, costFormat)}
            horizontalGrid={false}
            items={rows.map(row => ({
              ...row,
              id: row.serviceName,
              label: `${row.serviceName} · ${formatMetric(row.cost, costFormat)}`,
              value: row.cost,
            }))}
            itemActions={actions}
          />
        )}
      </VisualizationWidget>
    </GridItem>
    <GridItem>
      <Stack>
        <DataSection content={totalContent} label="Total cost" />
        <TextContent>
          <p>
            Select a service to see which customers contribute to its cost.
            Inspect any widget to check its data and definition.
          </p>
        </TextContent>
      </Stack>
    </GridItem>
  </Grid>
));
export function App() {
  return (
    <DataApp
      view={servicesView}
      summaryViews={[totalView]}
      details={[customersDetail]}
    >
      <DataSection content={overviewContent} label="Cost overview" />
    </DataApp>
  );
}

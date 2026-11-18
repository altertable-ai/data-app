import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  mountDataApp,
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
import { parseCount } from '@altertable/data-app/contract';
import { formatMetric } from '@altertable/data-app/format';

export const dataApp = defineDataApp({
  title: 'Infrastructure costs',
  description: 'September 2026 · USD · Fictional data',
  scope: { organization: 'demo', environment: 'sample' },
  appearance: { theme: 'system' },
  queries: {
    costsByService: {
      projections: {
        service_name: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(service_name, customer_name, cost_cents) AS (
  VALUES
    ('Compute', 'Atlas', 420000), ('Compute', 'Beacon', 210000), ('Compute', 'Cedar', 90000),
    ('Storage', 'Atlas', 80000), ('Storage', 'Beacon', 280000), ('Storage', 'Cedar', 120000),
    ('Networking', 'Atlas', 30000), ('Networking', 'Beacon', 60000), ('Networking', 'Cedar', 30000),
    ('Logging', 'Atlas', 0), ('Logging', 'Beacon', 0), ('Logging', 'Cedar', 0)
)
SELECT service_name, CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM infrastructure_costs
GROUP BY service_name
ORDER BY cost_cents DESC, service_name LIMIT $limit`,
      params: { limit: { type: 'number', defaultValue: 10 } },
    },
    totalCost: {
      projections: { cost_cents: { type: 'number' } },
      statement: `
WITH infrastructure_costs(service_name, customer_name, cost_cents) AS (
  VALUES
    ('Compute', 'Atlas', 420000), ('Compute', 'Beacon', 210000), ('Compute', 'Cedar', 90000),
    ('Storage', 'Atlas', 80000), ('Storage', 'Beacon', 280000), ('Storage', 'Cedar', 120000),
    ('Networking', 'Atlas', 30000), ('Networking', 'Beacon', 60000), ('Networking', 'Cedar', 30000),
    ('Logging', 'Atlas', 0), ('Logging', 'Beacon', 0), ('Logging', 'Cedar', 0)
)
SELECT CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM infrastructure_costs HAVING COUNT(*) > 0`,
      params: {},
    },
    costsByCustomer: {
      projections: {
        customer_name: { type: 'string' },
        cost_cents: { type: 'number' },
      },
      statement: `
WITH infrastructure_costs(service_name, customer_name, cost_cents) AS (
  VALUES
    ('Compute', 'Atlas', 420000), ('Compute', 'Beacon', 210000), ('Compute', 'Cedar', 90000),
    ('Storage', 'Atlas', 80000), ('Storage', 'Beacon', 280000), ('Storage', 'Cedar', 120000),
    ('Networking', 'Atlas', 30000), ('Networking', 'Beacon', 60000), ('Networking', 'Cedar', 30000),
    ('Logging', 'Atlas', 0), ('Logging', 'Beacon', 0), ('Logging', 'Cedar', 0)
)
SELECT customer_name, CAST(SUM(cost_cents) AS BIGINT) AS cost_cents
FROM infrastructure_costs
WHERE service_name = $serviceName
GROUP BY customer_name
ORDER BY cost_cents DESC, customer_name LIMIT $limit`,
      params: {
        serviceName: { type: 'string' },
        limit: { type: 'number', defaultValue: 10 },
      },
    },
  },
});

function parseService(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('serviceName' in value) ||
    typeof value.serviceName !== 'string' ||
    value.serviceName.trim().length === 0 ||
    value.serviceName.length > 100
  )
    throw new Error('Choose a service to inspect its customer costs.');
  return { serviceName: value.serviceName };
}
export const operations = dataApp.defineOperations({
  costsByService: dataApp.defineOperation({
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }) {
      const result = await query('costsByService');
      return result.rows.map(row => ({
        serviceName: row.service_name,
        cost: parseCount(row.cost_cents) / 100,
      }));
    },
  }),
  totalCost: dataApp.defineOperation({
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }) {
      const result = await query('totalCost');
      const row = result.rows[0];
      return row ? { cost: parseCount(row.cost_cents) / 100 } : null;
    },
  }),
  costsByCustomer: dataApp.defineOperation({
    input: parseService,
    checks: [{ serviceName: 'Compute' }],
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { serviceName }) {
      const result = await query('costsByCustomer', { serviceName });
      return result.rows.map(row => ({
        customerName: row.customer_name,
        cost: parseCount(row.cost_cents) / 100,
      }));
    },
  }),
});

const queryNames = {
  ...operations.costsByService.queryNames,
  ...operations.totalCost.queryNames,
  ...operations.costsByCustomer.queryNames,
};
const costDataContext = createDataContext(queryNames)({
  description:
    'Fictional customer allocations for September 2026, covering all four services and all three customers in this demo.',
  glossary: {
    allocatedCost: {
      term: 'Allocated cost',
      definition:
        'Infrastructure charges allocated to customers for September 2026, in USD. Customer allocations sum to each service; services sum to the total. Zero is a recorded charge of zero.',
      queryNames: [
        queryNames.costsByService,
        queryNames.totalCost,
        queryNames.costsByCustomer,
      ],
    },
  },
});

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
function App() {
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

mountDataApp({ app: dataApp, component: App });

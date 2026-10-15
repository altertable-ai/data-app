import { useState, useSyncExternalStore } from 'react';
import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import { parseCount } from '@altertable/data-app/contract';
import {
  Button,
  choiceVariable,
  createDataContext,
  createDataHooks,
  DataApp,
  DataValue,
  Grid,
  MetricWidget,
  Stack,
  TableWidget,
  TextContent,
  TextWidget,
  VisualizationWidget,
  injectDataAppStyles,
  mountDataApp,
  DataSection,
} from '@altertable/data-app/react';
import { BarChart, Select } from '@altertable/data-app/react/ui';
import {
  createSimulation,
  type ResponseMode,
  type SourceName,
} from '@/tests/public-api/fixtures/recovery-app/simulation';

const flow = new URLSearchParams(location.search).get('flow');
const simulation = createSimulation();
const app = defineDataApp({
  title: 'Reliable results',
  description: 'Deterministic query recovery.',

  scope: { organization: 'demo', environment: 'simulation' },
  queries: {
    sales: {
      statement:
        'SELECT channel, value FROM sales_fixture WHERE market = $market',
      params: { market: { defaultValue: 'all' } },
    },
    acquisition: {
      statement:
        'SELECT channel, value FROM acquisition_fixture WHERE market = $market',
      params: { market: { defaultValue: 'all' } },
    },
  },
});
function parseInput(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    !('market' in value) ||
    (value.market !== 'all' && value.market !== 'eu')
  )
    throw new Error('Expected all or eu.');
  return { market: value.market };
}
function parseRows(rows: unknown[][]) {
  return rows.map(([channel, value]) => {
    if (typeof channel !== 'string') throw new Error('Expected a channel.');
    return { channel, value: parseCount(value) };
  });
}
const operations = {
  sales: app.defineOperation({
    input: parseInput,
    checks: [{ market: 'all' }],
    policy: { maxQueryRows: 20, maxDurationMs: 300000 },
    async run({ query }, input) {
      return { rows: parseRows((await query('sales', input)).rows) };
    },
  }),
  acquisition: app.defineOperation({
    input: parseInput,
    checks: [{ market: 'all' }],
    policy: {
      maxQueryRows: 20,
      maxDurationMs: flow === 'timeout' ? 2500 : 300000,
    },
    async run({ query }, input) {
      return { rows: parseRows((await query('acquisition', input)).rows) };
    },
  }),
};
const context = createDataContext({
  sales: 'sales',
  acquisition: 'acquisition',
})({
  description:
    'Synthetic values exercise the same operation executor used by real queries. They are not business findings.',
  glossary: {
    revenue: {
      term: 'Revenue',
      definition: 'Synthetic EUR sales for the displayed market.',
      queryNames: ['sales'],
    },
    acquired: {
      term: 'Acquired customers',
      definition: 'Synthetic customer count for the displayed market.',
      queryNames: ['acquisition'],
    },
  },
});
const filters = {
  market: choiceVariable({
    key: 'market',
    label: 'Market',
    defaultValue: 'all',
    options: [
      { id: 'all', label: 'All markets' },
      { id: 'eu', label: 'Europe' },
    ],
  }),
};
const { defineDataView } = createDataHooks(
  createDataClient({ operations, lakehouse: simulation.lakehouse })
);
const salesView = defineDataView({
  operation: 'sales',
  dataContext: context,
  variables: filters,
  describeInput: input => (input.market === 'eu' ? 'Europe' : 'All markets'),
  isEmpty: data => !data.rows.length,
  emptyFallback: { title: 'No sales in this market' },
});
const acquisitionView = defineDataView({
  operation: 'acquisition',
  dataContext: context,
  variables: filters,
  describeInput: input => (input.market === 'eu' ? 'Europe' : 'All markets'),
  isEmpty: data => !data.rows.length,
  emptyFallback: { title: 'No acquisitions in this market' },
});
const sales = salesView.dataset({
  name: 'Sales',
  select: data => data.rows,
  rowKey: row => row.channel,
  evidence: { id: 'sales-rows', glossaryIds: ['revenue'] },
  columns: {
    channel: { value: row => row.channel },
    value: {
      label: 'Revenue',
      value: row => row.value,
      format: { kind: 'currency', currency: 'EUR' },
    },
  },
});
const acquisition = acquisitionView.dataset({
  name: 'Acquisition',
  select: data => data.rows,
  rowKey: row => row.channel,
  evidence: { id: 'acquisition-rows', glossaryIds: ['acquired'] },
  columns: {
    channel: { value: row => row.channel },
    value: {
      label: 'Customers',
      value: row => row.value,
      format: { kind: 'count' },
    },
  },
});
const revenue = salesView.metric(
  {
    id: 'revenue',
    glossaryId: 'revenue',
    format: { kind: 'currency', currency: 'EUR' },
  },
  data => ({ current: data.rows.reduce((total, row) => total + row.value, 0) })
);
const customers = acquisitionView.metric(
  { id: 'acquired', glossaryId: 'acquired', format: { kind: 'count' } },
  data => ({ current: data.rows.reduce((total, row) => total + row.value, 0) })
);
// The toolbar owns exactly one view. The other section remains independent.
const primaryIsAcquisition =
  new URLSearchParams(location.search).get('primary') === 'acquisition';
const primaryView = primaryIsAcquisition ? acquisitionView : salesView;
const primaryDataset = primaryIsAcquisition ? acquisition : sales;
const primaryMetric = primaryIsAcquisition ? customers : revenue;
const primaryTotal = primaryView.dataset({
  name: 'Total',
  select: data => [
    { total: data.rows.reduce((sum, row) => sum + row.value, 0) },
  ],
  rowKey: () => 'total',
  evidence: {
    id: 'total',
    queryNames: [primaryIsAcquisition ? 'acquisition' : 'sales'],
  },
  columns: { total: { value: row => row.total } },
});
const responseOptions: { id: ResponseMode; label: string }[] = [
  { id: 'success', label: 'Success' },
  { id: 'zero', label: 'Measured zero' },
  { id: 'empty', label: 'Empty result' },
  { id: 'busy', label: 'Rate limited' },
  { id: 'unavailable', label: 'Unavailable' },
  { id: 'forbidden', label: 'Access denied' },
  { id: 'rejected', label: 'Rejected SQL' },
  { id: 'malformed', label: 'Invalid query rows' },
];
function RequestControls() {
  useSyncExternalStore(simulation.subscribe, simulation.snapshot);
  return (
    <Stack>
      <Grid columns={2}>
        {(['sales', 'acquisition'] as const).map(name => (
          <SourceControls key={name} name={name} />
        ))}
      </Grid>
    </Stack>
  );
}
function SourceControls({ name }: { name: SourceName }) {
  const label = name === 'sales' ? 'Sales' : 'Acquisition';
  return (
    <Stack>
      <Select
        label={`Next ${label} response`}
        value={simulation.modes[name]}
        options={responseOptions}
        onChange={mode => simulation.setMode(name, mode as ResponseMode)}
      />
      <Button
        disabled={!simulation.pending.has(name)}
        onClick={() => simulation.complete(name)}
      >
        Complete {label}
      </Button>
      <output aria-label={`${label} requests`}>
        {simulation.attempts[name]} requests ·{' '}
        {simulation.pending.has(name) ? 'waiting' : 'settled'}
      </output>
    </Stack>
  );
}
function FragileChart({
  broken,
  rows,
}: {
  broken: boolean;
  rows: readonly { channel: string; value: number }[];
}) {
  if (broken) throw new Error('Fixture visualization failed.');
  return (
    <Stack>
      <BarChart
        ariaLabel="Customers by market"
        unit="customers"
        items={rows.map(row => ({
          id: row.channel,
          label: row.channel,
          value: row.value,
        }))}
      />
      <TextContent>
        <p>
          {rows.map(row => `${row.channel}: ${row.value} customers`).join('; ')}
        </p>
      </TextContent>
    </Stack>
  );
}
function App() {
  const [broken, setBroken] = useState(false);
  return (
    <DataApp
      view={primaryView}
      datasets={[primaryDataset, primaryTotal]}
      story={snapshot => [
        {
          id: 'primary',
          headline: primaryIsAcquisition
            ? `Acquired customers: ${customers.read(snapshot).value.current}`
            : `Revenue: ${revenue.read(snapshot).value.current} EUR`,
          context: `${primaryView.scope(snapshot)}${snapshot.state === 'stale-error' ? ' · last successful result' : ''}`,
          visual: <MetricWidget metric={primaryMetric} source={snapshot} />,
          evidence: primaryMetric,
        },
      ]}
    >
      <Stack>
        <RequestControls />
        <DataSection
          content={salesView.content(source => (
            <Stack>
              <Grid columns={2}>
                <MetricWidget metric={revenue} source={source} />
                <TableWidget
                  dataset={sales}
                  source={source}
                  pagination={false}
                />
              </Grid>
              <TextContent>
                <p>
                  Inline revenue: <DataValue metric={revenue} source={source} />
                  .
                </p>
              </TextContent>
            </Stack>
          ))}
        />
        <DataSection
          content={acquisitionView.content(source => (
            <Grid columns={2}>
              <MetricWidget metric={customers} source={source} />
              <TableWidget
                dataset={acquisition}
                source={source}
                pagination={false}
              />
              <TextWidget
                title="Acquisition finding"
                metric={customers}
                source={source}
              >
                {values => <p>Acquired {values.current} customers.</p>}
              </TextWidget>
              <VisualizationWidget
                title="Acquisition chart"
                dataset={acquisition}
                source={source}
                action={
                  <Button onClick={() => setBroken(value => !value)}>
                    {broken ? 'Repair visualization' : 'Break visualization'}
                  </Button>
                }
              >
                {rows => <FragileChart broken={broken} rows={rows} />}
              </VisualizationWidget>
            </Grid>
          ))}
        />
      </Stack>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });

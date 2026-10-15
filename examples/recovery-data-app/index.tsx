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
  type AppFinding,
  type AppSnapshots,
} from '@altertable/data-app/react';
import { BarChart, Select } from '@altertable/data-app/react/ui';
// eslint-disable-next-line no-restricted-imports -- Packaged examples resolve their own files.
import {
  createSimulation,
  type ResponseMode,
  type SourceName,
} from './simulation';

const flow = new URLSearchParams(location.search).get('flow');
const simulation = createSimulation();
const app = defineDataApp({
  title: 'Reliable results',
  description:
    'A deterministic recovery example. Every request waits for you to complete it.',
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
const views = { sales: salesView, acquisition: acquisitionView };
function story(snapshots: AppSnapshots<typeof views>): AppFinding[] {
  const findings: AppFinding[] = [];
  if (snapshots.sales)
    findings.push({
      id: 'sales',
      headline: `Revenue: ${revenue.read(snapshots.sales).value.current} EUR`,
      visual: <MetricWidget metric={revenue} source={snapshots.sales} />,
      evidence: revenue,
    });
  if (snapshots.acquisition)
    findings.push({
      id: 'acquisition',
      headline: `Acquired customers: ${customers.read(snapshots.acquisition).value.current}`,
      visual: (
        <MetricWidget metric={customers} source={snapshots.acquisition} />
      ),
      evidence: customers,
    });
  return findings;
}
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
function SimulationControls() {
  useSyncExternalStore(simulation.subscribe, simulation.snapshot);
  return (
    <Stack>
      <TextContent>
        <h2>Reproduce a request</h2>
        <p>
          Choose the next response, then complete the waiting request. Retry
          creates another waiting request. Change Market to reproduce refreshes
          with different inputs. Refresh data requests both views; Cancel
          refresh aborts pending work.
        </p>
      </TextContent>
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
  if (broken) throw new Error('Example visualization failed.');
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
    <DataApp views={views} datasets={[sales, acquisition]} story={story}>
      <Stack>
        <SimulationControls />
        <TextContent>
          <h2>Displayed results</h2>
          <p>
            Sales widgets share one request. Acquisition recovers independently.
            A zero remains a measured value; an empty response has no result to
            present.
          </p>
        </TextContent>
        <Grid columns={2}>
          <MetricWidget metric={revenue} />
          <TableWidget dataset={sales} pagination={false} />
          <MetricWidget metric={customers} />
          <TableWidget dataset={acquisition} pagination={false} />
          <TextWidget title="Acquisition finding" metric={customers}>
            {values => <p>Acquired {values.current} customers.</p>}
          </TextWidget>
          <VisualizationWidget
            title="Acquisition chart"
            dataset={acquisition}
            action={
              <Button onClick={() => setBroken(value => !value)}>
                {broken ? 'Repair visualization' : 'Break visualization'}
              </Button>
            }
          >
            {rows => <FragileChart broken={broken} rows={rows} />}
          </VisualizationWidget>
        </Grid>
        <TextContent>
          <p>
            Inline revenue: <DataValue metric={revenue} />.
          </p>
          <p>
            Break the chart to isolate a render failure. Repair visualization
            removes the cause; Retry remounts the chart without running SQL.
            Retrying before repair reproduces the same failure.
          </p>
        </TextContent>
      </Stack>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app, component: App });

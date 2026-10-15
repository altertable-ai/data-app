import { defineDataApp } from '@altertable/data-app';
import { variableInput, dimensionFilter } from '@altertable/data-app/contract';
const app = defineDataApp({
  title: 'Example',
  description: 'Example',
  scope: { organization: 'Example', environment: 'test' },
  queries: {
    customers: { statement: 'SELECT $member', params: { member: {} } },
  },
});
const customer = app.defineDimension({
  key: 'customer',
  label: 'Customer',
  selectionMode: 'single',
  valueType: 'number',
  source: { query: 'customers' },
});
app.defineDimension({
  key: 'bad',
  label: 'Bad',
  selectionMode: 'single',
  valueType: 'string',
  // @ts-expect-error Sources must name a registered query.
  source: { query: 'unknown' },
});
const parse = variableInput(() => ({ period: 'today' }), { customer });
const parsed = parse({});
const value: number | undefined =
  parsed.customer.kind === 'all' || parsed.customer.members[0]?.kind !== 'value'
    ? undefined
    : parsed.customer.members[0].value;
void value;
dimensionFilter({
  key: 'bad',
  label: 'Bad',
  selectionMode: 'single',
  valueType: 'string',
  // @ts-expect-error Static dimensions cannot use a query source.
  source: { query: 'customers' },
});

app.defineDimension({
  key: 'missing',
  label: 'Missing',
  valueType: 'number',
  selectionMode: 'single',
  source: { query: 'customers' },
  // @ts-expect-error Query sources resolve concrete values.
  allowMissing: true,
});

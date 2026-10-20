import { defineDataApp } from '@altertable/data-app';
import { createDataHooks, createDataContext } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import type {
  DataOperation,
  DimensionSelection,
} from '@altertable/data-app/contract';
import { variableInput, dimensionFilter } from '@altertable/data-app/contract';
const app = defineDataApp({
  title: 'Example',
  description: 'Example',
  scope: { organization: 'Example', environment: 'test' },
  queries: {
    customers: {
      statement: 'SELECT $member',
      params: { member: { type: 'number', nullable: true } },
      projections: { value: { type: 'number' }, label: { type: 'string' } },
    },
    nonNullableMember: {
      statement: 'SELECT $member',
      params: { member: { type: 'number' } },
      projections: { value: { type: 'number' }, label: { type: 'string' } },
    },
    wrongMember: {
      statement: 'SELECT $member',
      params: { member: { type: 'string', nullable: true } },
      projections: { value: { type: 'number' }, label: { type: 'string' } },
    },
    wrongValue: {
      statement: 'SELECT $member',
      params: { member: { type: 'number', nullable: true } },
      projections: { value: { type: 'string' }, label: { type: 'string' } },
    },
    wrongLabel: {
      statement: 'SELECT $member',
      params: { member: { type: 'number', nullable: true } },
      projections: { value: { type: 'number' }, label: { type: 'number' } },
    },
    wrongCount: {
      statement: 'SELECT $member',
      params: { member: { type: 'number', nullable: true } },
      projections: {
        value: { type: 'number' },
        label: { type: 'string' },
        count: { type: 'string' },
      },
    },
    nullableValue: {
      statement: 'SELECT $member',
      params: { member: { type: 'number', nullable: true } },
      projections: {
        value: { type: 'number', nullable: true },
        label: { type: 'string' },
      },
    },
    nullableLabel: {
      statement: 'SELECT $member',
      params: { member: { type: 'number', nullable: true } },
      projections: {
        value: { type: 'number' },
        label: { type: 'string', nullable: true },
      },
    },
    nullableCount: {
      statement: 'SELECT $member',
      params: { member: { type: 'number', nullable: true } },
      projections: {
        value: { type: 'number' },
        label: { type: 'string' },
        count: { type: 'number', nullable: true },
      },
    },
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
dimensionFilter<string>({
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

const sourceConfig = {
  key: 'invalid',
  label: 'Invalid',
  valueType: 'number',
  selectionMode: 'single',
} as const;
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'nonNullableMember' },
});
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'wrongMember' },
});
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'wrongValue' },
});
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'wrongLabel' },
});
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'wrongCount' },
});
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'nullableValue' },
});
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'nullableLabel' },
});
app.defineDimension({
  ...sourceConfig,
  // @ts-expect-error The query must declare a nullable member and concrete typed option fields.
  source: { query: 'nullableCount' },
});

// Independent sources do not acquire contextual facet dependencies when collected by name.
const sourceDimensions: Record<string, typeof customer> = { customer };
createDataHooks(
  createDataClient<{
    values: DataOperation<Record<string, DimensionSelection<number>>, number>;
  }>()
).defineDataView({
  operation: 'values',
  variables: sourceDimensions,
  bindings: Object.fromEntries(
    Object.keys(sourceDimensions).map(
      name =>
        [
          name,
          (input: Record<string, DimensionSelection<number>>) => input[name],
        ] as const
    )
  ),
  input: values => {
    const input: Record<string, DimensionSelection<number>> = {};
    for (const [name, value] of Object.entries(values))
      if (value) input[name] = value;
    return input;
  },
  dataContext: createDataContext({})({ description: 'Sources', glossary: {} }),
  describeInput: () => 'All',
  isEmpty: () => false,
  emptyFallback: { title: 'No values' },
});

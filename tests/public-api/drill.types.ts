import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  type DetailContent,
} from '@altertable/data-app/react';

const context = createDataContext({ sales: 'sales', orders: 'orders' })({
  description: 'Sales',
  glossary: {},
});
const hooks =
  createDataHooks(
    createDataClient<{
      sales: DataOperation<Record<string, never>, { regionId: number }[]>;
      orders: DataOperation<{ regionId: number }, { orderId: string }[]>;
    }>()
  );
const sales = hooks.defineDataView({
  operation: 'sales',
  dataContext: context,
  describeInput: () => 'All sales',
  isEmpty: data => data.length === 0,
  emptyFallback: { title: 'No sales' },
});
const regions = sales.dataset({
  name: 'Regions',
  select: data => data,
  rowKey: row => row.regionId,
  columns: { region: { value: row => row.regionId } },
  evidence: { id: 'regions', queryNames: ['sales'] },
});
const orders = hooks.defineDetailView({
  id: 'orders',
  title: 'Orders',
  operation: 'orders',
  dataContext: context,
  parseInput: value => value as { regionId: number },
  describeInput: input => `Region ${input.regionId}`,
  isEmpty: data => data.length === 0,
  emptyFallback: { title: 'No orders' },
});
const records = orders.dataset({
  name: 'Orders',
  select: data => data,
  rowKey: row => row.orderId,
  columns: { id: { value: row => row.orderId } },
  evidence: { id: 'orders', queryNames: ['orders'] },
});
const content: DetailContent = orders.content(
  source => (source.loading ? 'Loading' : source.data[0]?.orderId),
  {
    datasets: [records],
    story: () => [],
  }
);
regions.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: orders,
    input: row => ({ regionId: row.regionId }),
  }),
}));
regions.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: orders,
    // @ts-expect-error Destination IDs are numeric; formatted strings are not valid inputs.
    input: row => ({ regionId: String(row.regionId) }),
  }),
}));
regions.actions(action => ({
  orders: action.detail({
    label: 'View orders',
    target: orders,
    // @ts-expect-error Required destination scope cannot be omitted.
    input: () => ({}),
  }),
}));
orders.content(() => null, {
  // @ts-expect-error Detail exports must use datasets owned by the destination result shape.
  datasets: [regions],
  story: () => [],
});
void content;

// Filtering and hierarchy preserve the source's typed variable contract.
import {
  breakdownVariable,
  dimensionFilter,
  type BreakdownPath,
  type DimensionSelection,
} from '@altertable/data-app/contract';
const geography = breakdownVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    { id: 'region', label: 'Regions' },
    { id: 'country', label: 'Countries' },
  ],
});
const region = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  options: [{ value: 'Europe', label: 'Europe' }],
});
const scoped = createDataHooks(
  createDataClient<{
    scoped: DataOperation<
      { region: DimensionSelection<string>; geography: BreakdownPath },
      { id: string; label: string }[]
    >;
  }>()
).defineDataView({
  operation: 'scoped',
  dataContext: context,
  variables: { region, geography },
  describeInput: () => 'Scoped sales',
  isEmpty: data => data.length === 0,
  emptyFallback: { title: 'No groups' },
});
const scopedGroups = scoped.dataset({
  name: 'Groups',
  select: data => data,
  rowKey: row => row.id,
  columns: { name: { value: row => row.label } },
  evidence: { id: 'groups', queryNames: ['sales'] },
});
scopedGroups.actions(
  action => ({
    filter: action.filter({
      label: 'Filter region',
      target: scoped,
      values: row => ({
        region: {
          kind: 'include' as const,
          members: [{ kind: 'value' as const, value: row.id }],
        },
      }),
    }),
    descend: action.descend({
      target: scoped.breakdown('geography'),
      member: row => ({ id: row.id, label: row.label }),
    }),
  }),
  { primary: 'descend' }
);
scopedGroups.actions(action => ({
  filter: action.filter({
    label: 'Filter',
    target: scoped,
    // @ts-expect-error Filter values retain the dimension-selection shape.
    values: row => ({ region: row.id }),
  }),
}));
scopedGroups.actions(action => ({
  filter: action.filter({
    label: 'Filter',
    target: scoped,
    // @ts-expect-error Unknown target variable names are rejected.
    values: () => ({ customer: { kind: 'all' } }),
  }),
}));
// @ts-expect-error Only declared hierarchy variables provide breakdown targets.
scoped.breakdown('region');
scopedGroups.actions(
  action => ({
    filter: action.filter({
      label: 'Filter',
      target: scoped,
      values: () => ({ region: { kind: 'all' as const } }),
    }),
  }),
  // @ts-expect-error A primary action must be present in the declared action map.
  { primary: 'missing' }
);
regions.actions(action => ({
  descend: action.descend({
    // @ts-expect-error A hierarchy must read the binding's displayed input shape.
    target: scoped.breakdown('geography'),
    member: row => ({ id: row.regionId, label: 'Region' }),
  }),
}));

import { choiceVariable } from '@altertable/data-app/react';
const displayVariable = choiceVariable({
  key: 'sort',
  label: 'Sort',
  options: [{ id: 'revenue', label: 'Revenue' }],
  defaultValue: 'revenue',
  presentation: { group: 'display' },
});
const displayView = createDataHooks(
  createDataClient<{
    display: DataOperation<{ sort: string; geography: BreakdownPath }, number>;
  }>()
).defineDataView({
  operation: 'display',
  dataContext: context,
  variables: { sort: displayVariable, geography },
  describeInput: () => 'Display',
  isEmpty: () => false,
  emptyFallback: { title: 'No display' },
});
// @ts-expect-error Grouping paths use hierarchy transitions rather than filter writes.
scoped.filter({ geography: [] });
// @ts-expect-error Display settings are excluded from typed filter targets.
displayView.filter({ sort: 'revenue' });
scopedGroups.actions(action => ({
  filter: action.filter({
    label: 'Filter',
    target: displayView,
    // @ts-expect-error Action mappings cannot modify declared display settings.
    values: () => ({ sort: 'revenue' }),
  }),
}));

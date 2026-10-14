import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  type DetailContent,
} from '@altertable/data-app/react';

const context = createDataContext({ sales: 'sales', orders: 'orders' })({
  description: 'Sales',
  glossary: {
    count: {
      term: 'Count',
      definition: 'Number of regions.',
      queryNames: ['sales'],
    },
  },
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
const content: DetailContent = orders.content(source =>
  source.loading ? 'Loading' : source.data[0]?.orderId
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
void content;

// Filtering and hierarchy preserve the source's typed variable contract.
import {
  hierarchyVariable,
  dimensionFilter,
  type HierarchyStateOf,
  type DimensionSelection,
} from '@altertable/data-app/contract';
const geography = hierarchyVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      groupLabel: 'Regions',
      valueType: 'string',
      options: [{ value: 'Europe', label: 'Europe' }],
    },
    {
      id: 'country',
      label: 'Country',
      groupLabel: 'Countries',
      valueType: 'string',
      options: [{ value: 'France', label: 'France', parent: 'Europe' }],
    },
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
      {
        region: DimensionSelection<string>;
        geography: HierarchyStateOf<typeof geography>;
      },
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
      target: scoped.hierarchy('geography'),
      member: row => row.id,
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
scoped.hierarchy('region');
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
    target: scoped.hierarchy('geography'),
    member: row => row.regionId,
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
    display: DataOperation<
      { sort: string; geography: HierarchyStateOf<typeof geography> },
      number
    >;
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

const target = scoped.hierarchy('geography');
target.filter({ region: 'Europe' });
// @ts-expect-error Region IDs are strings.
target.filter({ region: 42 });
// @ts-expect-error Only declared levels may be selected.
target.filter({ unknown: 'France' });
scopedGroups.actions(action => ({
  filter: action.filter({
    label: 'Filter',
    target,
    values: row => ({ region: row.id }),
  }),
}));
scopedGroups.actions(action => ({
  filter: action.filter({
    label: 'Filter',
    target,
    // @ts-expect-error Exploration mappings preserve the level value type.
    values: () => ({ region: 42 }),
  }),
}));

geography.parse(geography.defaultValue);
const typedState: HierarchyStateOf<typeof geography> = geography.defaultValue;
// @ts-expect-error Grouping can only name a declared level.
typedState.groupBy = 'unknown';
hierarchyVariable({
  key: 'bad',
  label: 'Bad',
  levels: [
    // @ts-expect-error Option values must agree with the level's declared value type.
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      options: [{ value: 42, label: 'Forty-two' }],
    },
  ],
});

scopedGroups.actions(action => ({
  filter: action.filter({
    label: 'Filter',
    // @ts-expect-error Exploration targets must include the full bound contract.
    target: {
      kind: 'hierarchy',
      variable: geography,
      read: () => geography.defaultValue,
      filter: (_values: { region?: string }) => {},
    },
    values: () => ({ region: 'Europe' }),
  }),
}));

typedState.selection.region = {
  // @ts-expect-error Hierarchy scope cannot exclude members or select several at once.
  kind: 'exclude',
  members: [{ kind: 'value', value: 'Europe' }],
};
typedState.selection.region = {
  kind: 'include',
  // @ts-expect-error Region selection retains its string ID type.
  members: [{ kind: 'value', value: 42 }],
};

const count = sales.metric(
  {
    id: 'count',
    glossaryId: 'count',
    format: { kind: 'count' },
  },
  data => ({ current: data.length })
);
count.records({ target: orders, input: () => ({ regionId: 1 }) });
count.records({
  target: orders,
  // @ts-expect-error Record destination IDs must match the typed operation input.
  input: () => ({ regionId: 'one' }),
});

scopedGroups.actions(action => ({
  descend: action.descend({
    target: scoped.hierarchy('geography'),
    // @ts-expect-error A descent selects a scalar member ID, not an object wrapper.
    member: row => ({ id: row.id }),
  }),
}));

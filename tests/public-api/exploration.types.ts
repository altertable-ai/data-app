import { createDataClient } from '@altertable/data-app/client';
import {
  hierarchyVariable,
  type DataOperation,
} from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  choiceVariable,
  multiChoiceVariable,
  MetricWidget,
  TableWidget,
  type AppVariableValues,
} from '@altertable/data-app/react';
const geography = hierarchyVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      options: [{ value: 'eu', label: 'Europe' }],
    },
    {
      id: 'customer',
      label: 'Customer',
      valueType: 'number',
      options: [{ value: 1, label: 'One', parent: 'eu' }],
    },
  ],
});
const by = geography.breakdown({ key: 'by' });
const sort = choiceVariable({
  key: 'sort',
  options: [{ id: 'asc', label: 'Ascending' }],
  defaultValue: 'asc',
  presentation: { group: 'display' },
});
type Input = {
  geography: typeof geography.defaultValue;
  by: 'region' | 'customer';
  sort: string;
};
const hooks =
  createDataHooks(
    createDataClient<{
      sales: DataOperation<Input, { rows: { id: string; value: number }[] }>;
    }>()
  );
const context = createDataContext({ sales: 'sales' })({
  description: 'Sales',
  glossary: {
    total: { term: 'Total', definition: 'Total value.', queryNames: ['sales'] },
  },
});
const view = hooks.defineDataView({
  operation: 'sales',
  dataContext: context,
  variables: { geography, by, sort },
  describeInput: () => 'Sales',
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
});
view.hierarchy('geography');
view.breakdown('by');
// @ts-expect-error Only hierarchy variables are hierarchy targets.
view.hierarchy('by');
// @ts-expect-error Only breakdown variables are breakdown targets.
view.breakdown('geography');
const rows = view.dataset({
  name: 'Rows',
  select: data => data.rows,
  rowKey: row => row.id,
  columns: { id: { value: row => row.id } },
  evidence: { id: 'rows', queryNames: ['sales'] },
});
rows.actions(action => ({
  good: action.filter({
    label: 'Region',
    target: view.hierarchy('geography'),
    values: () => ({ region: 'eu' }),
  }),
  wrong: action.filter({
    label: 'Customer',
    target: view.hierarchy('geography'),
    // @ts-expect-error Numeric hierarchy members retain their type.
    values: () => ({ customer: 'one' }),
  }),
  scope: action.filter({
    label: 'Scope',
    target: view.filter(),
    // @ts-expect-error Ordinary filters cannot write hierarchy selections.
    values: () => ({ geography: geography.defaultValue }),
  }),
  breakdown: action.filter({
    label: 'Breakdown',
    target: view.filter(),
    // @ts-expect-error Ordinary filters cannot write chart display variables.
    values: () => ({ by: 'region' }),
  }),
  display: action.filter({
    label: 'Sort',
    target: view.filter(),
    // @ts-expect-error Ordinary filters cannot write display choices.
    values: () => ({ sort: 'asc' }),
  }),
}));
rows.actions(
  action => ({
    descend: action.descend({
      target: view.breakdown('by'),
      member: row => row.id,
    }),
  }),
  {
    // @ts-expect-error Primary action must be a declared key.
    primary: 'missing',
  }
);

const total = view.metric(
  { id: 'total', glossaryId: 'total', format: { kind: 'count' } },
  data => ({ current: data.rows.length })
);
const metricActions = total.actions(action => ({
  region: action.filter({
    label: 'Europe',
    target: view.hierarchy('geography'),
    values: () => ({ region: 'eu' }),
  }),
}));
const rowActions = rows.actions(action => ({
  region: action.filter({
    label: 'Europe',
    target: view.hierarchy('geography'),
    values: () => ({ region: 'eu' }),
  }),
}));
MetricWidget({
  metric: total,
  source: { loading: true },
  actions: metricActions,
});
TableWidget({ dataset: rows, source: { loading: true }, actions: rowActions });
MetricWidget({
  metric: total,
  source: { loading: true },
  // @ts-expect-error Metric actions have no dataset row.
  actions: rowActions,
});
TableWidget({
  dataset: rows,
  source: { loading: true },
  // @ts-expect-error Dataset actions retain their row type.
  actions: metricActions,
});

const numericHierarchy = hierarchyVariable({
  key: 'numeric',
  label: 'Numeric',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'number',
      options: [{ value: 1, label: 'One' }],
    },
  ],
});
const stringVariables = {
  geography,
  by,
  scope: choiceVariable({
    key: 'scope',
    defaultValue: 'a',
    options: [{ id: 'a', label: 'A' }],
  }),
};
const numberVariables = {
  geography: numericHierarchy,
  by: numericHierarchy.breakdown({ key: 'by' }),
  scope: multiChoiceVariable({
    key: 'scope',
    options: [{ id: 'a', label: 'A' }],
  }),
};
const targetHooks =
  createDataHooks(
    createDataClient<{
      strings: DataOperation<
        AppVariableValues<typeof stringVariables>,
        unknown
      >;
      numbers: DataOperation<
        AppVariableValues<typeof numberVariables>,
        unknown
      >;
    }>()
  );
const targetView = {
  dataContext: context,
  describeInput: () => 'Targets',
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
};
const stringTargets = targetHooks.defineDataView({
  ...targetView,
  operation: 'strings',
  variables: stringVariables,
});
const numberTargets = targetHooks.defineDataView({
  ...targetView,
  operation: 'numbers',
  variables: numberVariables,
});
const stringFilter = stringTargets.filter();
const numberFilter = numberTargets.filter();
const stringHierarchy = stringTargets.hierarchy('geography');
const numberHierarchy = numberTargets.hierarchy('geography');
const stringBreakdown = stringTargets.breakdown('by');
const numberBreakdown = numberTargets.breakdown('by');
// @ts-expect-error Filter targets preserve their ordinary selection types in declarations.
numberFilter satisfies typeof stringFilter;
// @ts-expect-error Hierarchy targets preserve level IDs and member types in declarations.
numberHierarchy satisfies typeof stringHierarchy;
// @ts-expect-error Breakdown targets preserve their hierarchy's levels in declarations.
numberBreakdown satisfies typeof stringBreakdown;
// @ts-expect-error Target kinds remain distinct even when their hierarchy levels match.
stringHierarchy satisfies typeof stringBreakdown;

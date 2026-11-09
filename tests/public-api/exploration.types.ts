import {
  createDataHooks,
  createDataContext,
  choiceFilter,
  displayChoice,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  type FilterValues,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  dimensionFilter,
  type DataOperation,
} from '@altertable/data-app/contract';
const region = dimensionFilter<string>({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  options: [{ value: 'eu', label: 'Europe' }],
});
const customer = dimensionFilter<number>({
  key: 'customer',
  label: 'Customer',
  valueType: 'number',
  selectionMode: 'single',
  options: [{ value: 1, label: 'One' }],
});
const by = displayChoice({
  key: 'by',
  label: 'Breakdown',
  defaultValue: 'region',
  options: [
    { id: 'region', label: 'Region' },
    { id: 'customer', label: 'Customer' },
  ],
  presentation: { control: 'widget' },
});
const sort = displayChoice({
  key: 'sort',
  options: [{ id: 'asc', label: 'Ascending' }],
  defaultValue: 'asc',
});
const mode = choiceFilter({
  key: 'mode',
  defaultValue: 'all',
  options: [{ id: 'all', label: 'All' }],
});
type Input = {
  region: typeof region.defaultValue;
  customer: typeof customer.defaultValue;
  by: 'region' | 'customer';
  sort: string;
  mode: string;
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
  filters: hooks.defineFilters({ region, customer, by, sort, mode }),
  describeInput: () => 'Sales',
});
view.breakdown('by');
// @ts-expect-error Only display choices can be chart breakdown targets.
view.breakdown('region');
// @ts-expect-error Scope choices cannot be chart breakdown targets.
view.breakdown('mode');
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
    target: view.filter(),
    values: () => ({
      region: { kind: 'include', members: [{ kind: 'value', value: 'eu' }] },
    }),
  }),
  wrong: action.filter({
    label: 'Customer',
    target: view.filter(),
    values: () => ({
      customer: {
        kind: 'include',
        members: [
          {
            kind: 'value',
            // @ts-expect-error Numeric members retain their type.
            value: 'one',
          },
        ],
      },
    }),
  }),
  breakdown: action.filter({
    label: 'Breakdown',
    target: view.filter(),
    // @ts-expect-error Ordinary filters cannot write chart display options.
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
    drill: action.filter({
      label: 'Drill down',
      target: view.filter(),
      values: () => ({ region: region.defaultValue }),
      breakdown: { target: view.breakdown('by'), value: () => 'customer' },
    }),
    wrongChoice: action.filter({
      label: 'Wrong',
      target: view.filter(),
      values: () => ({}),
      breakdown: {
        target: view.breakdown('by'),
        // @ts-expect-error Chart choice IDs are preserved.
        value: () => 'unknown',
      },
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
    target: view.filter(),
    values: () => ({
      region: { kind: 'include', members: [{ kind: 'value', value: 'eu' }] },
    }),
  }),
}));
const rowActions = rows.actions(action => ({
  region: action.filter({
    label: 'Europe',
    target: view.filter(),
    values: () => ({
      region: { kind: 'include', members: [{ kind: 'value', value: 'eu' }] },
    }),
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

const stringCollection = { region, by };
const numberCollection = {
  region: customer,
  by: displayChoice({
    key: 'by',
    defaultValue: 'one',
    options: [{ id: 'one', label: 'One' }],
  }),
};
const targetHooks =
  createDataHooks(
    createDataClient<{
      strings: DataOperation<FilterValues<typeof stringCollection>, unknown>;
      numbers: DataOperation<FilterValues<typeof numberCollection>, unknown>;
    }>()
  );
const definition = {
  dataContext: context,
  describeInput: () => 'Targets',
};
const strings = targetHooks.defineDataView({
  ...definition,
  operation: 'strings',
  filters: targetHooks.defineFilters(stringCollection),
});
const numbers = targetHooks.defineDataView({
  ...definition,
  operation: 'numbers',
  filters: targetHooks.defineFilters(numberCollection),
});
const stringFilter = strings.filter();
const numberFilter = numbers.filter();
const stringBreakdown = strings.breakdown('by');
const numberBreakdown = numbers.breakdown('by');
// @ts-expect-error Filter targets preserve member types in declarations.
numberFilter satisfies typeof stringFilter;
// @ts-expect-error Breakdown targets preserve choice IDs in declarations.
numberBreakdown satisfies typeof stringBreakdown;
// @ts-expect-error Target kinds remain distinct.
stringFilter satisfies typeof stringBreakdown;

VisualizationWidget({
  dataset: rows,
  source: { loading: true },
  actions: rowActions,
  viewLabel: 'Display',
  views: [
    {
      id: 'chart',
      label: 'Chart',
      render: (data, actions) => {
        actions(data[0]!);
        // @ts-expect-error Alternate-view actions retain the dataset row type.
        actions({ id: 1, value: 2 });
        return null;
      },
    },
  ],
});

import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  createDataContext,
  MetricWidget,
  TableWidget,
  VisualizationWidget,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  choiceFilter,
  dimensionFilter,
  displayChoice,
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
const app = defineDataApp({
  title: 'Exploration',
  description: 'Explore sales.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {},
});
const policy = { maxQueryRows: 10, maxDurationMs: 1000 };
async function noRows(): Promise<{ rows: { id: string; value: number }[] }> {
  return { rows: [] };
}
const hooks = createDataHooks(
  createDataClient({
    operations: {
      sales: app.defineOperation({
        filters: { region, customer, by, sort, mode },
        policy,
        run: noRows,
      }),
      strings: app.defineOperation({
        filters: { region, by },
        policy,
        run: noRows,
      }),
    },
  })
);
const context = createDataContext({ sales: 'sales' })({
  description: 'Sales',
  glossary: {
    total: { term: 'Total', definition: 'Total value.', queryNames: ['sales'] },
  },
});
const view = hooks.defineView({ operation: 'sales', dataContext: context });
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

const numberHooks = createDataHooks(
  createDataClient({
    operations: {
      numbers: app.defineOperation({
        filters: {
          region: customer,
          by: displayChoice({
            key: 'by',
            defaultValue: 'one',
            options: [{ id: 'one', label: 'One' }],
          }),
        },
        policy,
        run: noRows,
      }),
    },
  })
);
const strings = hooks.defineView({
  operation: 'strings',
  dataContext: context,
});
const numbers = numberHooks.defineView({
  operation: 'numbers',
  dataContext: context,
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

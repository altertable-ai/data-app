import { createDataClient } from '@altertable/data-app/client';
import {
  hierarchyVariable,
  type DataOperation,
} from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  choiceVariable,
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
  glossary: {},
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

import { defineDataApp } from '@altertable/data-app';
import {
  choiceVariable,
  createDataContext,
  createDataHooks,
  dateRangeVariable,
  multiChoiceVariable,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineDateRangeContract,
  defineOperation,
  dimensionFilter,
  parseEmptyInput,
  type DataOperation,
  type DateRangeRequest,
  type DimensionOption,
} from '@altertable/data-app/contract';

const operation = {
  queries: {},
  input: parseEmptyInput,
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run() {
    return 1;
  },
};
defineOperation({ ...operation, checks: [{}] });
defineOperation({ ...operation, checks: [{}, {}] as const });
// @ts-expect-error Every operation declares at least one input check.
defineOperation({ ...operation, checks: [] });
declare const uncheckedInputs: Record<string, never>[];
// @ts-expect-error An ordinary array does not guarantee a check input.
defineOperation({ ...operation, checks: uncheckedInputs });
const app = defineDataApp({
  title: 'Declarations',
  description: 'Check declaration invariants.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {},
});
// @ts-expect-error App-bound operations also require a check input.
app.defineOperation({ ...operation, checks: [] });

const dimension = {
  key: 'region',
  label: 'Region',
  valueType: 'string' as const,
  options: [],
};
dimensionFilter({ ...dimension, selectionMode: 'single' });
dimensionFilter({ ...dimension, selectionMode: 'single', maxSelected: 1 });
dimensionFilter({ ...dimension, selectionMode: 'multiple', maxSelected: 2 });
// @ts-expect-error A single selection cannot allow two selected members.
dimensionFilter({ ...dimension, selectionMode: 'single', maxSelected: 2 });
declare const dynamicLimit: number;
// @ts-expect-error Single selections require the known limit of one.
dimensionFilter({
  ...dimension,
  selectionMode: 'single',
  maxSelected: dynamicLimit,
});
dimensionFilter({
  ...dimension,
  selectionMode: 'multiple',
  maxSelected: dynamicLimit,
});

const choices = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
] as const;
choiceVariable({ key: 'choice', options: choices, defaultValue: 'a' });
multiChoiceVariable({
  key: 'choices',
  options: choices,
  defaultValue: ['a', 'b'],
});
multiChoiceVariable({ key: 'choices', options: choices, defaultValue: [] });
// @ts-expect-error Defaults belong to the declared choices.
choiceVariable({ key: 'choice', options: choices, defaultValue: 'missing' });
multiChoiceVariable({
  key: 'choices',
  options: choices,
  // @ts-expect-error Every default belongs to the declared choices.
  defaultValue: ['a', 'missing'],
});
choiceVariable({
  key: 'choice',
  options: [{ id: 'a', label: 'Alpha' }],
  // @ts-expect-error Inline choice IDs are preserved without a const assertion.
  defaultValue: 'missing',
});
// @ts-expect-error A fixed-choice declaration requires options.
choiceVariable({ key: 'choice', options: [], defaultValue: 'a' });
// @ts-expect-error Multiple-choice declarations also require options.
multiChoiceVariable({ key: 'choices', options: [] });
declare const dynamicChoices: { id: string; label: string }[];
choiceVariable({
  key: 'choice',
  options: dynamicChoices,
  defaultValue: 'dynamic',
});

const context = createDataContext({ count: 'count' })({
  description: 'Counts',
  glossary: { count: { term: 'Count', definition: 'Measured count' } },
});
const hooks =
  createDataHooks(
    createDataClient<{
      count: DataOperation<Record<string, never>, number>;
      time: DataOperation<DateRangeRequest, number>;
      regions: DataOperation<Record<string, never>, DimensionOption<string>[]>;
    }>()
  );
const feedback = {
  dataContext: context,
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
};
const view = hooks.defineDataView({
  ...feedback,
  operation: 'count',
  describeInput: () => 'all',
});
const metric = {
  id: 'count',
  glossaryId: 'count' as const,
  format: { kind: 'count' as const },
};
view.metric(metric, data => ({ current: data }));
// @ts-expect-error Comparisons require a date binding on the owning view.
view.metric(metric, data => ({ current: data, previous: 1 }));
// @ts-expect-error A null comparison measurement still requires a date binding.
view.metric(metric, data => ({ current: data, previous: null }));
const comparisonValues = { current: 1, previous: 0 };
// @ts-expect-error Intermediate values cannot bypass the comparison requirement.
view.metric(metric, () => comparisonValues);

const calendar = defineDateRangeContract({ maxRangeDays: 90, timeZone: 'UTC' });
const period = dateRangeVariable({
  key: 'period',
  contract: calendar,
  defaultValue: { kind: 'preset', id: 'last-7' },
});
const dated = hooks.defineDataView({
  ...feedback,
  operation: 'time',
  variables: { period },
  input: values => values.period,
  date: { variable: 'period', input: input => input },
});
dated.metric(metric, data => ({ current: data, previous: 0 }));
dated.metric(metric, data => ({ current: data, previous: null }));
const timeView = hooks.defineTimeView({
  ...feedback,
  operation: 'time',
  time: { contract: calendar, defaultValue: { kind: 'preset', id: 'last-7' } },
});
timeView.metric(metric, data => ({ current: data, previous: 0 }));

const dataset = {
  name: 'Counts',
  select: (data: number) => [data],
  rowKey: (row: number) => row,
  evidence: { id: 'counts', queryNames: ['count'] as const },
};
view.dataset({
  ...dataset,
  columns: { count: { value: row => row.toFixed(0) } },
});
// @ts-expect-error A dataset declaration needs at least one column.
view.dataset({ ...dataset, columns: {} });
const emptyColumns = {};
// @ts-expect-error Intermediate empty column declarations are rejected too.
view.dataset({ ...dataset, columns: emptyColumns });
// @ts-expect-error Columns retain the inferred row type.
view.dataset({ ...dataset, columns: { count: { value: row => row.missing } } });

const facet = { context: {}, operation: 'regions' as const, input: () => ({}) };
hooks.defineFacetFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  maxSelected: 1,
  facet,
});
const invalidFacetLimit = {
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  maxSelected: 2,
  facet,
} as const;
// @ts-expect-error Typed facet declarations also constrain single-selection limits.
hooks.defineFacetFilter(invalidFacetLimit);

const mixedDimension = {
  key: 'mixed',
  label: 'Mixed',
  valueType: 'string',
  selectionMode: 'single',
  options: [{ value: 42, label: 'Numeric' }],
} as const;
// @ts-expect-error A union generic cannot uncouple string settings from numeric options.
dimensionFilter<string | number>(mixedDimension);
declare const mixedValueType: 'string' | 'number';
// @ts-expect-error Select a primitive contract before declaring fixed options.
dimensionFilter<string | number>({
  ...mixedDimension,
  valueType: mixedValueType,
});

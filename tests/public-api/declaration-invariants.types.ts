import { defineDataApp } from '@altertable/data-app';
import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  choiceFilter,
  dateTimeRangeFilter,
  defineOperation,
  dimensionFilter,
  facetFilter,
  multiChoiceFilter,
  type DimensionOption,
} from '@altertable/data-app/contract';

function parseRecordId(value: unknown): { id: string } {
  if (!value || typeof value !== 'object' || !('id' in value))
    throw new Error('Expected a record id.');
  return { id: String(value.id) };
}
const operation = {
  queries: {},
  input: parseRecordId,
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run() {
    return 1;
  },
};
defineOperation({ ...operation, checks: [{ id: 'a' }] });
defineOperation({ ...operation, checks: [{ id: 'a' }, { id: 'b' }] as const });
// @ts-expect-error Every operation declares at least one input check.
defineOperation({ ...operation, checks: [] });
declare const uncheckedInputs: { id: string }[];
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
choiceFilter({ key: 'choice', options: choices, defaultValue: 'a' });
multiChoiceFilter({
  key: 'choices',
  options: choices,
  defaultValue: ['a', 'b'],
});
multiChoiceFilter({ key: 'choices', options: choices, defaultValue: [] });
// @ts-expect-error Defaults belong to the declared choices.
choiceFilter({ key: 'choice', options: choices, defaultValue: 'missing' });
multiChoiceFilter({
  key: 'choices',
  options: choices,
  // @ts-expect-error Every default belongs to the declared choices.
  defaultValue: ['a', 'missing'],
});
choiceFilter({
  key: 'choice',
  options: [{ id: 'a', label: 'Alpha' }],
  // @ts-expect-error Inline choice IDs are preserved without a const assertion.
  defaultValue: 'missing',
});
// @ts-expect-error A fixed-choice declaration requires options.
choiceFilter({ key: 'choice', options: [], defaultValue: 'a' });
// @ts-expect-error Multiple-choice declarations also require options.
multiChoiceFilter({ key: 'choices', options: [] });
declare const dynamicChoices: { id: string; label: string }[];
choiceFilter({
  key: 'choice',
  options: dynamicChoices,
  defaultValue: 'dynamic',
});

const context = createDataContext({ count: 'count' })({
  description: 'Counts',
  glossary: { count: { term: 'Count', definition: 'Measured count' } },
});
const period = dateTimeRangeFilter({
  key: 'period',
  maxRangeDays: 90,
  timeZone: 'UTC',
  comparison: 'off',
  defaultValue: '7d',
});
const policy = { maxQueryRows: 1, maxDurationMs: 1000 };
const hooks = createDataHooks(
  createDataClient({
    operations: {
      count: app.defineOperation({
        policy,
        async run() {
          return 1;
        },
      }),
      time: app.defineOperation({
        filters: { period },
        policy,
        async run() {
          return 1;
        },
      }),
      regions: app.defineOperation({
        policy,
        async run(): Promise<DimensionOption<string>[]> {
          return [];
        },
      }),
    },
  })
);
const view = hooks.defineView({ dataContext: context, operation: 'count' });
const metric = {
  id: 'count',
  glossaryId: 'count' as const,
  format: { kind: 'count' as const },
};
view.metric(metric, data => ({ current: data }));
// @ts-expect-error Comparisons require the operation to read a date range.
view.metric(metric, data => ({ current: data, previous: 1 }));
// @ts-expect-error A null comparison measurement still requires a date range.
view.metric(metric, data => ({ current: data, previous: null }));
const comparisonValues = { current: 1, previous: 0 };
// @ts-expect-error Intermediate values cannot bypass the comparison requirement.
view.metric(metric, () => comparisonValues);

const dated = hooks.defineView({ dataContext: context, operation: 'time' });
dated.metric(metric, data => ({ current: data, previous: 0 }));
dated.metric(metric, data => ({ current: data, previous: null }));

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

const facet = {
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  options: 'regions',
} as const;
facetFilter({ ...facet, maxSelected: 1 });
const invalidFacetLimit = { ...facet, maxSelected: 2 } as const;
// @ts-expect-error Facet declarations also constrain single-selection limits.
facetFilter(invalidFacetLimit);

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

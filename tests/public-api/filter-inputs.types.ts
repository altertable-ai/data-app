import { defineDataApp } from '@altertable/data-app';
import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  booleanFilter,
  choiceFilter,
  dateRangeFilter,
  defineDateRangeContract,
  dimensionFilter,
  multiChoiceFilter,
  numberFilter,
  searchFilter,
  type BooleanSelection,
  type DateRangeRequest,
  type DimensionSelection,
  type NumberSelection,
} from '@altertable/data-app/contract';

const app = defineDataApp({
  title: 'Filter inputs',
  description: 'Operations receive one flat field per filter.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {},
});
const policy = { maxQueryRows: 1, maxDurationMs: 1000 };
const organization = dimensionFilter<string>({
  key: 'org',
  label: 'Organization',
  valueType: 'string',
  selectionMode: 'single',
  options: [{ value: 'worldia', label: 'Worldia' }],
});
const window = choiceFilter({
  key: 'window',
  defaultValue: '90',
  options: [{ id: '90', label: '90 days' }],
});
const filters = {
  organization,
  window,
  amount: numberFilter({ key: 'amount', label: 'Amount' }),
  active: booleanFilter({ key: 'active', label: 'Active' }),
  search: searchFilter({ key: 'q', label: 'Search' }),
  choices: multiChoiceFilter({
    key: 'choices',
    label: 'Choices',
    options: [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two' },
    ],
    defaultValue: [],
  }),
  period: dateRangeFilter({
    key: 'period',
    contract: defineDateRangeContract({
      minDate: '2026-01-01',
      maxRangeDays: 90,
      timeZone: 'UTC',
    }),
    defaultValue: { kind: 'preset', id: 'last-7' },
  }),
};

type ExpectedInput = {
  organization: DimensionSelection<string>;
  window: '90';
  amount: NumberSelection;
  active: BooleanSelection;
  search: string;
  choices: readonly string[];
  period: DateRangeRequest;
};
const operations = {
  usage: app.defineOperation({
    filters,
    policy,
    async run(_context, input) {
      const expected: ExpectedInput = input;
      // @ts-expect-error A choice arrives as its option id.
      const windowDays: number = input.window;
      // @ts-expect-error A dimension arrives as its selection, not a scalar value.
      const organizationId: string = input.organization;
      // @ts-expect-error A date range arrives as a resolved request, not a URL selection.
      void input.period.kind;
      // @ts-expect-error The input has no field beyond the declared filters.
      void input.invented;
      void [expected, windowDays, organizationId];
      return 1;
    },
  }),
};

declare const mixedFilter: typeof organization | typeof window;
app.defineOperation({
  filters: { organization: mixedFilter },
  policy,
  async run(_context, input) {
    // @ts-expect-error Narrow a filter declaration before reading its input.
    const selection: DimensionSelection<string> = input.organization;
    void selection;
    return 1;
  },
});

const context = createDataContext({ usage: 'usage' })({
  description: 'Usage with preserved filter selections.',
  glossary: {},
});
const usage = createDataHooks(createDataClient({ operations })).defineView({
  operation: 'usage',
  dataContext: context,
  describeInput(input) {
    const expected: ExpectedInput = input;
    return expected.search;
  },
});
usage.dataset({
  name: 'Usage',
  select: (data, input) => [{ id: input.window, value: data }],
  rowKey: row => row.id,
  columns: { value: { value: row => row.value } },
  evidence: { id: 'usage', queryNames: ['usage'] },
});

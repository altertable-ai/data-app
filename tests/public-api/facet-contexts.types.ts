import { defineDataApp } from '@altertable/data-app';
import { createDataContext, createDataHooks } from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  dateRangeFilter,
  defineDateRangeContract,
  dimensionFilter,
  facetFilter,
  searchFilter,
  type DateRangeRequest,
  type DimensionOption,
  type DimensionSelection,
} from '@altertable/data-app/contract';

const app = defineDataApp({
  title: 'Facets',
  description: 'Facet options follow their operation filters.',
  scope: { organization: 'demo', environment: 'test' },
  queries: {},
});
const policy = { maxQueryRows: 10, maxDurationMs: 1000 };
const period = dateRangeFilter({
  key: 'period',
  contract: defineDateRangeContract({ maxRangeDays: 90, timeZone: 'UTC' }),
  defaultValue: { kind: 'preset', id: 'last-7' },
});
const search = searchFilter({ key: 'search' });
const region = facetFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'multiple',
  options: 'regions',
});
const numeric = facetFilter({
  key: 'numeric',
  label: 'Numeric',
  valueType: 'number',
  selectionMode: 'single',
  options: 'numbers',
});
const numericValue: number =
  numeric.defaultValue.kind === 'include' &&
  numeric.defaultValue.members[0]?.kind === 'value'
    ? numeric.defaultValue.members[0].value
    : 0;
void numericValue;

const operations = {
  // The facet's context is its options operation's filters.
  regions: app.defineOperation({
    filters: { search, period },
    policy,
    async run(_context, input): Promise<DimensionOption<string>[]> {
      const text: string = input.search;
      const dates: DateRangeRequest = input.period;
      // @ts-expect-error The context is the operation's filters, not an arbitrary map.
      void input.invented;
      // @ts-expect-error Date filters resolve to requests rather than URL selections.
      const selection: 'preset' = input.period.kind;
      void [text, dates, selection];
      return [];
    },
  }),
  numbers: app.defineOperation({
    policy,
    async run(): Promise<readonly DimensionOption<number>[]> {
      return [];
    },
  }),
  // A dependent facet's options can read another facet's typed selection.
  dependents: app.defineOperation({
    filters: { region },
    policy,
    async run(_context, input): Promise<DimensionOption<number>[]> {
      if (input.region.kind === 'include') {
        const member = input.region.members[0];
        if (member?.kind === 'value') {
          const value: string = member.value;
          void value;
        }
      }
      return [];
    },
  }),
  view: app.defineOperation({
    filters: {
      search,
      period,
      region,
      numeric,
      dependent: facetFilter({
        key: 'dependent',
        label: 'Dependent',
        valueType: 'number',
        selectionMode: 'single',
        options: 'dependents',
      }),
    },
    policy,
    async run(_context, input) {
      const regions: DimensionSelection<string> = input.region;
      const numbers: DimensionSelection<number> = input.numeric;
      void [regions, numbers];
      return 1;
    },
  }),
};
const hooks = createDataHooks(createDataClient({ operations }));
const context = createDataContext({})({ description: 'Facets', glossary: {} });
hooks.defineView({ operation: 'view', dataContext: context });

const stringOptions = app.defineOperation({
  policy,
  async run(): Promise<DimensionOption<string>[]> {
    return [];
  },
});
const numberOptions = app.defineOperation({
  policy,
  async run(): Promise<DimensionOption<number>[]> {
    return [];
  },
});
const invalidOptions = app.defineOperation({
  policy,
  async run(): Promise<{ value: string; label: number }[]> {
    return [];
  },
});
const regionView = app.defineOperation({
  filters: { region },
  policy,
  async run() {
    return 1;
  },
});
const numericView = app.defineOperation({
  filters: { numeric },
  policy,
  async run() {
    return 1;
  },
});
createDataClient({ operations: { view: regionView, regions: stringOptions } });
createDataClient({ operations: { view: numericView, numbers: numberOptions } });
// @ts-expect-error Numeric operation output cannot supply string options.
createDataClient({
  operations: { view: regionView, regions: numberOptions },
});
// @ts-expect-error String operation output cannot supply numeric options.
createDataClient({
  operations: { view: numericView, numbers: stringOptions },
});
// @ts-expect-error Facets refer to operations in this client's registry.
createDataClient({ operations: { view: regionView } });
// @ts-expect-error Facet options require string labels.
createDataClient({
  operations: { view: regionView, regions: invalidOptions },
});

const rawFacet = {
  key: 'raw',
  label: 'Raw',
  valueType: 'string',
  selectionMode: 'single',
  options: [],
  facet: { operation: 'anything', input: () => ({}) },
} as const;
// @ts-expect-error Fixed-option filters cannot bypass operation typing with raw facets.
dimensionFilter(rawFacet);
const namedOptions = {
  key: 'named',
  label: 'Named',
  valueType: 'string',
  selectionMode: 'single',
  options: 'regions',
} as const;
// @ts-expect-error Fixed-option filters cannot name an options operation.
dimensionFilter(namedOptions);

// @ts-expect-error Executable facet metadata is not a public field callers can replace.
void region.facet;

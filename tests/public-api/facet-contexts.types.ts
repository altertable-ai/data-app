import { createDataClient } from '@altertable/data-app/client';
import {
  dimensionFilter,
  defineDateRangeContract,
  type DataOperation,
  type DateRangeRequest,
  type DimensionOption,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  dateRangeVariable,
  searchVariable,
  choiceVariable,
} from '@altertable/data-app-react';

type Operations = {
  strings: DataOperation<
    { search: string; period: DateRangeRequest },
    DimensionOption<string>[]
  >;
  numbers: DataOperation<
    Record<string, never>,
    readonly DimensionOption<number>[]
  >;
  invalid: DataOperation<
    Record<string, never>,
    { value: string; label: number }[]
  >;
  timed: DataOperation<
    {
      period: DateRangeRequest;
      search: string;
      region: DimensionSelection<string>;
    },
    number
  >;
  view: DataOperation<
    { region: DimensionSelection<string>; numeric: DimensionSelection<number> },
    number
  >;
};
const hooks = createDataHooks(createDataClient<Operations>());
const period = dateRangeVariable({
  key: 'period',
  contract: defineDateRangeContract({ maxRangeDays: 90, timeZone: 'UTC' }),
  defaultValue: { kind: 'preset', id: 'last-7' },
});
const search = searchVariable({ key: 'search' });
const region = hooks.defineFacetFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'multiple',
  facet: {
    context: { search, period },
    operation: 'strings',
    input(values) {
      const text: string = values.search;
      const dates: DateRangeRequest = values.period;
      // @ts-expect-error The context is the declared dependency collection, not an arbitrary map.
      void values.invented;
      // @ts-expect-error A facet cannot depend on its own selection before it is declared.
      void values.region;
      // @ts-expect-error Date variables resolve to requests rather than URL selections.
      const selection: 'preset' = values.period.kind;
      void selection;
      return { search: text, period: dates };
    },
  },
});
const numeric = hooks.defineFacetFilter({
  key: 'numeric',
  label: 'Numeric',
  valueType: 'number',
  selectionMode: 'single',
  facet: { context: {}, operation: 'numbers', input: () => ({}) },
});
const numericValue: number =
  numeric.defaultValue.kind === 'include' &&
  numeric.defaultValue.members[0]?.kind === 'value'
    ? numeric.defaultValue.members[0].value
    : 0;
void numericValue;
const wrongValueType = {
  key: 'numeric',
  label: 'Numeric',
  valueType: 'string',
  selectionMode: 'single',
  facet: { context: {}, operation: 'numbers', input: () => ({}) },
} as const;
// @ts-expect-error Numeric operation output cannot supply string options.
hooks.defineFacetFilter(wrongValueType);
const wrongStringType = {
  key: 'string',
  label: 'String',
  valueType: 'number',
  selectionMode: 'single',
  facet: {
    context: { search, period },
    operation: 'strings',
    input: () => ({ search: '', period: period.input(period.defaultValue) }),
  },
} as const;
// @ts-expect-error String operation output cannot supply numeric options.
hooks.defineFacetFilter(wrongStringType);
const unknownOperation = {
  key: 'unknown',
  label: 'Unknown',
  valueType: 'string',
  selectionMode: 'single',
  facet: { context: {}, operation: 'missing', input: () => ({}) },
} as const;
// @ts-expect-error Facets refer to operations in this client's registry.
hooks.defineFacetFilter(unknownOperation);
const wrongInput = {
  key: 'wrong',
  label: 'Wrong',
  valueType: 'string',
  selectionMode: 'single',
  facet: { context: {}, operation: 'strings', input: () => ({ search: 1 }) },
} as const;
// @ts-expect-error The mapper must return the selected operation's input.
hooks.defineFacetFilter(wrongInput);
const wrongOutput = {
  key: 'wrong',
  label: 'Wrong',
  valueType: 'string',
  selectionMode: 'single',
  facet: { context: {}, operation: 'invalid', input: () => ({}) },
} as const;
// @ts-expect-error Facet options require string labels.
hooks.defineFacetFilter(wrongOutput);
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

const context = createDataContext({})({ description: 'Facets', glossary: {} });
const base = {
  operation: 'view' as const,
  dataContext: context,
  describeInput: () => 'All',
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
  input: (values: {
    region: DimensionSelection<string>;
    numeric: DimensionSelection<number>;
  }) => ({ region: values.region, numeric: values.numeric }),
};
hooks.defineDataView({
  ...base,
  variables: { search, period, region, numeric },
});
// @ts-expect-error A consuming view must provide every facet dependency.
hooks.defineDataView({ ...base, variables: { region, numeric } });
const incompatibleContext = {
  ...base,
  variables: { search: numeric, period, region, numeric },
};
// @ts-expect-error A dependency with the same name but a different type is incompatible.
hooks.defineDataView(incompatibleContext);
// @ts-expect-error A missing date dependency is also rejected.
hooks.defineDataView({ ...base, variables: { search, region, numeric } });
const extra = choiceVariable({
  key: 'display',
  options: [{ id: 'table', label: 'Table' }],
  defaultValue: 'table',
});
hooks.defineDataView({
  ...base,
  variables: { search, period, region, numeric, extra },
});
// A dependent facet can consume another already-declared facet's typed selection.
hooks.defineFacetFilter({
  key: 'dependent',
  label: 'Dependent',
  valueType: 'number',
  selectionMode: 'single',
  facet: {
    context: { region },
    operation: 'numbers',
    input(values) {
      if (values.region.kind === 'include') {
        const member = values.region.members[0];
        if (member?.kind === 'value') {
          const value: string = member.value;
          void value;
        }
      }
      return {};
    },
  },
});

const time = {
  contract: defineDateRangeContract({ maxRangeDays: 90, timeZone: 'UTC' }),
  defaultValue: { kind: 'preset', id: 'last-7' },
} as const;
const timed = {
  operation: 'timed' as const,
  dataContext: context,
  time,
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
};
hooks.defineTimeView({ ...timed, variables: { search, region } });
const missingTimeContext = {
  ...timed,
  variables: { region },
  input: (values: {
    period: DateRangeRequest;
    region: DimensionSelection<string>;
  }) => ({ ...values, search: '' }),
};
// @ts-expect-error Time views validate facet dependencies against the implicit period and explicit variables.
hooks.defineTimeView(missingTimeContext);

// @ts-expect-error Executable facet metadata is not a public field callers can replace.
void region.facet;

declare const chooseContext: boolean;
const fixedRegion = dimensionFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  options: [],
});
const conditionalTimeVariables = chooseContext
  ? { region }
  : { region: fixedRegion };
const conditionalTime = {
  ...missingTimeContext,
  variables: conditionalTimeVariables,
};
// @ts-expect-error Time views cannot erase a conditional facet's context requirements.
hooks.defineTimeView(conditionalTime);

import {
  choiceVariable,
  searchVariable,
  multiChoiceVariable,
  createDataContext,
  createDataHooks,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  booleanFilter,
  dimensionFilter,
  numberFilter,
  type BooleanSelection,
  type DataOperation,
  type DimensionSelection,
  type NumberSelection,
} from '@altertable/data-app/contract';

const context = createDataContext({ usage: 'usage' })({
  description: 'Usage with preserved filter selections.',
  glossary: {},
});
const organization = dimensionFilter<string>({
  key: 'org',
  label: 'Organization',
  valueType: 'string',
  selectionMode: 'single',
  options: [{ value: 'worldia', label: 'Worldia' }],
});
const variables = {
  organization,
  window: choiceVariable({
    key: 'window',
    defaultValue: '90',
    options: [{ id: '90', label: '90 days' }],
  }),
};
type Filters = {
  organization: DimensionSelection<string>;
  amount: NumberSelection;
  active: BooleanSelection;
};
const filters = {
  organization,
  amount: numberFilter({ key: 'amount', label: 'Amount' }),
  active: booleanFilter({ key: 'active', label: 'Active' }),
};
const hooks =
  createDataHooks(
    createDataClient<{
      flattened: DataOperation<{ org: string; windowId: string }, number>;
      mappedSearch: DataOperation<{ query: string }, number>;
      mappedChoices: DataOperation<{ selected: readonly string[] }, number>;
      direct: DataOperation<
        { organization: DimensionSelection<string>; window: string },
        number
      >;
      optional: DataOperation<
        { organization?: DimensionSelection<string>; window: string },
        number
      >;
      wrongType: DataOperation<
        { organization: string; window: string },
        number
      >;
      narrow: DataOperation<{ organization: { kind: 'all' } }, number>;
      mixedVariable: DataOperation<{ org: string }, number>;
      union: DataOperation<
        { organization: DimensionSelection<string> } | { org: string },
        number
      >;
      nested: DataOperation<{ filters: Filters }, number>;
    }>()
  );
const feedback = {
  dataContext: context,
  describeInput: () => 'usage',
  isEmpty: () => false,
  emptyFallback: { title: 'No usage' },
};

declare const selectedVariables:
  | typeof variables
  | Pick<typeof variables, 'window'>;
hooks.defineDataView({
  ...feedback,
  operation: 'direct',
  variables: selectedVariables,
  input: values => ({ organization: { kind: 'all' as const }, ...values }),
});

declare const mixedVariable: typeof organization | typeof variables.window;
hooks.defineDataView({
  ...feedback,
  operation: 'mixedVariable',
  // @ts-expect-error Narrow a variable declaration before deriving its bindings.
  variables: { organization: mixedVariable },
  input: () => ({ org: 'worldia' }),
});

// @ts-expect-error The original app drops organization without a binding to recover it.
hooks.defineDataView({
  ...feedback,
  operation: 'flattened',
  variables,
  input: () => ({ org: 'worldia', windowId: '90' }),
});
// @ts-expect-error An optional field cannot supply an automatic filter binding.
hooks.defineDataView({
  ...feedback,
  operation: 'optional',
  variables,
  input: values => values,
});
// @ts-expect-error A scalar organization field cannot preserve a dimension selection.
hooks.defineDataView({
  ...feedback,
  operation: 'wrongType',
  variables,
  input: () => ({ organization: 'worldia', window: '90' }),
});
// @ts-expect-error Every input union member must supply the automatic filter field.
hooks.defineDataView({
  ...feedback,
  operation: 'union',
  variables: { organization },
  input: values => values,
});
// @ts-expect-error An all-only field cannot carry every organization selection.
hooks.defineDataView({
  ...feedback,
  operation: 'narrow',
  variables: { organization },
  input: () => ({ organization: { kind: 'all' } }),
});
// @ts-expect-error Nested filter fields require explicit bindings.
hooks.defineDataView({
  ...feedback,
  operation: 'nested',
  variables: filters,
  input: values => ({ filters: values }),
});
hooks.defineDataView({
  ...feedback,
  operation: 'nested',
  variables: filters,
  input: values => ({ filters: values }),
  // @ts-expect-error All nested filters require bindings, including amount and active.
  bindings: { organization: input => input.filters.organization },
});
hooks.defineDataView({
  ...feedback,
  operation: 'flattened',
  variables,
  input: () => ({ org: 'worldia', windowId: '90' }),
  bindings: {
    // @ts-expect-error A binding returns a selection, not its scalar query parameter.
    organization: input => input.org,
  },
});

// Direct fields and canonical inputs need no repeated binding configuration.
hooks.defineDataView({ ...feedback, operation: 'direct', variables });
hooks.defineDataView({
  ...feedback,
  operation: 'direct',
  variables,
  input: values => values,
});
hooks.defineDataView({
  ...feedback,
  operation: 'nested',
  variables: filters,
  input: values => ({ filters: values }),
  bindings: {
    organization: input => input.filters.organization,
    amount: input => input.filters.amount,
    active: input => input.filters.active,
  },
});
// Renamed scope choices need a reader for displayed-state freshness.
// @ts-expect-error A renamed scope choice requires a binding.
hooks.defineDataView({
  ...feedback,
  operation: 'flattened',
  variables: { window: variables.window },
  input: values => ({ org: '', windowId: values.window }),
});
hooks.defineDataView({
  ...feedback,
  operation: 'flattened',
  variables: { window: variables.window },
  input: values => ({ org: '', windowId: values.window }),
  bindings: {
    window: input => {
      if (input.windowId !== '90') throw new Error('Invalid window');
      return input.windowId;
    },
  },
});

const search = { search: searchVariable({ key: 'q', label: 'Search' }) };
// @ts-expect-error A renamed search needs a reader.
hooks.defineDataView({
  ...feedback,
  operation: 'mappedSearch',
  variables: search,
  input: values => ({ query: values.search }),
});
hooks.defineDataView({
  ...feedback,
  operation: 'mappedSearch',
  variables: search,
  input: values => ({ query: values.search }),
  bindings: { search: input => input.query },
});
const selections = {
  choices: multiChoiceVariable({
    key: 'choices',
    label: 'Choices',
    options: [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two' },
    ],
    defaultValue: [],
  }),
};
// @ts-expect-error A renamed multi-choice needs a reader.
hooks.defineDataView({
  ...feedback,
  operation: 'mappedChoices',
  variables: selections,
  input: values => ({ selected: values.choices }),
});
hooks.defineDataView({
  ...feedback,
  operation: 'mappedChoices',
  variables: selections,
  input: values => ({ selected: values.choices }),
  bindings: { choices: input => input.selected },
});

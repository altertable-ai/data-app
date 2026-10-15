import { useAppVariables } from '@altertable/data-app-react/ui';
type VariableCollection = Parameters<typeof useAppVariables>[0];
import { defineDataApp } from '@altertable/data-app';
import {
  parseEmptyInput,
  type QueryDefinitions,
  type QueryParameter,
  type QueryProjections,
  type DimensionVariable,
  type DataOperation,
  type DimensionOption,
} from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  createDataContext,
  searchVariable,
} from '@altertable/data-app-react';

const header = {
  title: 'Contracts',
  description: 'Preserve authoring evidence.',
  scope: { organization: 'demo', environment: 'test' },
};
const inputQuery = {
  statement: 'SELECT $search AS value',
  params: { search: { type: 'string' } },
  projections: { value: { type: 'string' } },
} as const;
const emptyQuery = {
  statement: 'SELECT 1 AS value',
  params: {},
  projections: { value: { type: 'number' } },
} as const;
const broad: QueryDefinitions = { items: inputQuery };
// @ts-expect-error A broad annotation cannot preserve names or required parameters.
defineDataApp({ ...header, queries: broad });
declare const choose: boolean;
const conditional = choose ? { items: inputQuery } : { items: emptyQuery };
// @ts-expect-error Query-definition unions must be narrowed before declaration.
defineDataApp({ ...header, queries: conditional });
const params = choose ? { search: inputQuery.params.search } : {};
// @ts-expect-error Parameter-map unions cannot hide a required input.
defineDataApp({ ...header, queries: { items: { ...inputQuery, params } } });
const widenedParams: Readonly<Record<string, QueryParameter>> =
  inputQuery.params;
defineDataApp({
  ...header,
  // @ts-expect-error Names and types must remain available at the authoring boundary.
  queries: { items: { ...inputQuery, params: widenedParams } },
});
const projections: QueryProjections = inputQuery.projections;
defineDataApp({
  ...header,
  // @ts-expect-error Projection aliases must remain statically known.
  queries: { items: { ...inputQuery, projections } },
});
// @ts-expect-error Numeric registry keys are not named query IDs.
defineDataApp({ ...header, queries: { 1: emptyQuery } });
const symbol = Symbol('ignored');
// @ts-expect-error Symbols are not serializable manifest query names.
defineDataApp({ ...header, queries: { [symbol]: emptyQuery } });
const app = defineDataApp({
  ...header,
  queries: { items: inputQuery } satisfies QueryDefinitions,
});
app.defineOperation({
  input: parseEmptyInput,
  checks: [{}],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run({ query }) {
    await query('items');
    // @ts-expect-error Names remain exact with satisfies.
    await query('invented');
    // @ts-expect-error Known row limits must be positive.
    await query('items', { search: 'text' }, { limit: 0 });
    // @ts-expect-error Negative row limits cannot execute.
    await query('items', { search: 'text' }, { limit: -1 });
    // @ts-expect-error Fractional row limits cannot execute.
    await query('items', { search: 'text' }, { limit: 1.5 });
    return (await query('items', { search: 'text' })).rows;
  },
});

type Source = {
  strings: DataOperation<{ search: string }, DimensionOption<string>[]>;
  view: DataOperation<Record<string, never>, number>;
};
const hooks = createDataHooks(createDataClient<Source>());
const search = searchVariable({ key: 'search' });
const facet = hooks.defineFacetFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  facet: {
    context: { search },
    operation: 'strings',
    input: values => ({ search: values.search }),
  },
});
// @ts-expect-error A facet cannot be widened to a fixed-option filter.
const erased: DimensionVariable<string> = facet;
void erased;
const variables: VariableCollection = { region: facet };
const feedback = {
  operation: 'view' as const,
  dataContext: createDataContext({})({ description: 'View', glossary: {} }),
  input: () => ({}),
  describeInput: () => 'All',
  isEmpty: () => false,
  emptyFallback: { title: 'Empty' },
};
// @ts-expect-error A broad collection cannot erase facet dependencies.
hooks.defineDataView({ ...feedback, variables });
const missing = createDataHooks(createDataClient<{ view: Source['view'] }>());
const dependent = {
  ...feedback,
  variables: { search, region: facet },
  bindings: { region: () => facet.defaultValue },
};
// @ts-expect-error The receiving registry must contain the facet operation.
missing.defineDataView(dependent);
const wrongInput =
  createDataHooks(
    createDataClient<{
      view: Source['view'];
      strings: DataOperation<{ search: number }, DimensionOption<string>[]>;
    }>()
  );
// @ts-expect-error Reused facets must supply the receiving operation's input type.
wrongInput.defineDataView(dependent);
const wrongOutput =
  createDataHooks(
    createDataClient<{
      view: Source['view'];
      strings: DataOperation<{ search: string }, DimensionOption<number>[]>;
    }>()
  );
// @ts-expect-error Reused facets must match the receiving operation's option value type.
wrongOutput.defineDataView(dependent);
hooks.defineDataView(dependent);

const noDefault = {
  ...inputQuery,
  params: {
    search: { type: 'string', defaultValue: undefined },
  },
} as const;
// @ts-expect-error A default must be a concrete typed value, never undefined.
defineDataApp({ ...header, queries: { items: noDefault } });
const untyped = createDataClient();
async function unknownDelivery() {
  const response = await untyped.query('external', {});
  // @ts-expect-error A type annotation cannot turn unchecked network data into a number.
  const data: number = response.data;
  return data;
}
void unknownDelivery;
// @ts-expect-error Clients without an operation contract cannot be relabeled through hooks.
createDataHooks<Source>(untyped);

const erasedClient = { query: untyped.query };
// @ts-expect-error Extracting a method cannot manufacture an operation registry contract.
createDataHooks<Source>(erasedClient);

import { dimensionFilter } from '@altertable/data-app/contract';
const fixed = dimensionFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'single',
  options: [],
});
const conditionalVariables = choose ? { region: facet } : { region: fixed };
// @ts-expect-error Narrow conditional variable maps before declaring facet dependencies.
hooks.defineDataView({ ...feedback, variables: conditionalVariables });
const conditionalVariable = { region: choose ? facet : fixed };
// @ts-expect-error A conditional member cannot hide the facet's required search variable.
hooks.defineDataView({ ...feedback, variables: conditionalVariable });
const conditionalContext = choose ? { search } : {};
const invalidContext = {
  key: 'conditional',
  label: 'Conditional',
  valueType: 'string',
  selectionMode: 'single',
  facet: {
    context: conditionalContext,
    operation: 'strings',
    input: () => ({ search: '' }),
  },
} as const;
// @ts-expect-error Narrow conditional context declarations before creating a facet.
hooks.defineFacetFilter(invalidContext);

// @ts-expect-error Empty names cannot be registered queries.
defineDataApp({ ...header, queries: { '': emptyQuery } });
defineDataApp({
  ...header,
  // @ts-expect-error An empty literal statement cannot execute SQL.
  queries: { empty: { ...emptyQuery, statement: '' } },
});
// @ts-expect-error Bare __proto__ is a prototype setter, not an own query declaration.
defineDataApp({ ...header, queries: { __proto__: emptyQuery } });
const inheritedParams = {
  ...emptyQuery,
  params: { __proto__: inputQuery.params.search },
};
// @ts-expect-error Parameter declarations must be own properties.
defineDataApp({ ...header, queries: { inherited: inheritedParams } });
const inheritedProjections = {
  ...emptyQuery,
  projections: { __proto__: { type: 'string' } },
} as const;
// @ts-expect-error Projection declarations must be own properties.
defineDataApp({ ...header, queries: { inherited: inheritedProjections } });

type Branches = {
  alpha: DataOperation<{ text: string }, number>;
  beta: DataOperation<{ count: number }, number>;
};
const branchClient = createDataClient<Branches>();
const operation = choose ? 'alpha' : 'beta';
// @ts-expect-error Narrow the operation before supplying its branch-specific input.
void branchClient.query(operation, { text: 'only alpha' });
void branchClient.query('alpha', { text: 'alpha' });
const branchHooks = createDataHooks(branchClient);
const branchView = {
  ...feedback,
  operation,
  input: () => ({ text: 'only alpha' }),
};
// @ts-expect-error A view cannot decouple a conditional operation from its input mapper.
branchHooks.defineDataView(branchView);

const inheritedContext = {
  ...invalidContext,
  facet: { ...invalidContext.facet, context: { __proto__: search } },
};
// @ts-expect-error Prototype setters cannot declare facet dependencies.
hooks.defineFacetFilter(inheritedContext);

declare const alphaOperation: Branches['alpha'];
declare const betaOperation: Branches['beta'];
const conditionalOperations = choose
  ? { branch: alphaOperation }
  : { branch: betaOperation };
// @ts-expect-error Narrow operation registries so each name owns one input contract.
createDataClient({ operations: conditionalOperations });
// @ts-expect-error A prototype setter cannot register an own operation.
createDataClient({ operations: { __proto__: alphaOperation } });

createDataClient({
  // @ts-expect-error A conditional operation member must also be narrowed before registration.
  operations: { branch: choose ? alphaOperation : betaOperation },
});

// @ts-expect-error Omitting transport options cannot hide an ambiguous operation registry.
createDataClient<typeof conditionalOperations>();

import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  numberFilter,
  booleanFilter,
  dimensionFilter,
  parseNumberSelection,
  parseBooleanSelection,
  parseDimensionSelection,
  type NumberSelection,
  type BooleanSelection,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  mountDataApp,
  injectDataAppStyles,
  searchVariable,
  choiceVariable,
  multiChoiceVariable,
} from '@altertable/data-app/react';
const dataApp = defineDataApp({
  title: 'Filter workflows',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
const amount = numberFilter({
  key: 'amount',
  label: 'Amount',
  min: 0,
  max: 100,
  defaultValue: { kind: 'range', min: 10 },
});
const active = booleanFilter({
  key: 'active',
  label: 'Active',
  defaultValue: { kind: 'is', value: true },
});
const country = dimensionFilter<string>({
  key: 'country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'multiple',
  allowExclusion: true,
  options: [
    { value: 'FR', label: 'France' },
    { value: 'UK', label: 'United Kingdom' },
  ],
});
const options = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];
const search = searchVariable({ key: 'q', label: 'Search' });
const choice = choiceVariable({
  key: 'choice',
  label: 'Display',
  options,
  defaultValue: 'a',
});
const tags = multiChoiceVariable({ key: 'tags', label: 'Tags', options });
type Input = {
  search: string;
  choice: string;
  tags: readonly string[];
  amount: NumberSelection;
  active: BooleanSelection;
  country: DimensionSelection<string>;
};
const defaults: Input = {
  search: '',
  choice: 'a',
  tags: [],
  amount: amount.defaultValue,
  active: active.defaultValue,
  country: country.defaultValue,
};
const operation = dataApp.defineOperation({
  input(value: unknown): Input {
    const input = value as Input;
    if (
      !input ||
      !search.valid(input.search) ||
      !choice.valid(input.choice) ||
      !tags.valid(input.tags)
    )
      throw new Error('Invalid variables');
    return {
      ...input,
      amount: parseNumberSelection(input.amount, amount),
      active: parseBooleanSelection(input.active, active),
      country: parseDimensionSelection(input.country, country),
    };
  },
  output(value: unknown) {
    return value as Input;
  },
  checks: [defaults],
  policy: { maxQueryRows: 1, maxDurationMs: 1000 },
  async run(_context, input) {
    return input;
  },
});
const client = createDataClient({
  operations: { filters: operation },
  lakehouse: {
    async queryAll() {
      return { columns: [], rows: [] };
    },
  },
});
const { defineDataView } = createDataHooks(client);
const view = defineDataView({
  dataContext: createDataContext({ filters: 'filters' })({
    description: 'Filter result',
    glossary: {},
  }),
  operation: 'filters',
  variables: { search, choice, tags, amount, active, country },
  describeInput: input => JSON.stringify(input),
  isEmpty: () => false,
  emptyFallback: { title: 'No result' },
});
const dataset = view.dataset({
  name: 'Result',
  select: value => [value],
  rowKey: () => 'result',
  columns: { result: { value: row => JSON.stringify(row) } },
  evidence: { id: 'result', queryNames: ['filters'] },
});
const content = view.content(source => (
  <TextWidget title="Result" source={source} dataset={dataset}>
    {rows => (
      <output aria-label="Displayed filters">{JSON.stringify(rows[0])}</output>
    )}
  </TextWidget>
));

function App() {
  return (
    <DataApp view={view} datasets={[dataset]} story={() => []}>
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

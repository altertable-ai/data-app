import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import {
  booleanFilter,
  choiceFilter,
  dimensionFilter,
  multiChoiceFilter,
  numberFilter,
  searchFilter,
} from '@altertable/data-app/contract';
const dataApp = defineDataApp({
  title: 'Filter workflows',
  description: 'Explore how filters change displayed results.',
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
const search = searchFilter({ key: 'q', label: 'Search' });
const choice = choiceFilter({
  key: 'choice',
  label: 'Display',
  options,
  defaultValue: 'a',
});
const tags = multiChoiceFilter({ key: 'tags', label: 'Tags', options });
const operation = dataApp.defineOperation({
  filters: { search, choice, tags, amount, active, country },
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
const { defineView } = createDataHooks(client);
const view = defineView({
  dataContext: createDataContext({ filters: 'filters' })({
    description: 'Filter result',
    glossary: {},
  }),
  operation: 'filters',
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
  const hideSearch = new URLSearchParams(location.search).has('hideSearch');
  const hideControls = new URLSearchParams(location.search).has('hideControls');
  const hideFilters = new URLSearchParams(location.search).has('hideFilters');
  return (
    <DataApp
      view={view}
      datasets={[dataset]}
      story={() => []}
      showSearch={hideControls || hideSearch ? false : undefined}
      showFilters={hideControls || hideFilters ? false : undefined}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

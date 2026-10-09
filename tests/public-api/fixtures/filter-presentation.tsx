import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  booleanFilter,
  dimensionFilter,
  numberFilter,
  parseBooleanSelection,
  parseDimensionSelection,
  parseNumberSelection,
} from '@altertable/data-app/contract';
import {
  choiceVariable,
  searchVariable,
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TableWidget,
  TextContent,
  injectDataAppStyles,
  mountDataApp,
  type AppVariableValues,
} from '@altertable/data-app/react';

const dataApp = defineDataApp({
  title: 'Customer explorer',
  description:
    'Find customer accounts, narrow the scope, and choose how to view the results. Sample data.',
  scope: { organization: 'Demo', environment: 'Preview' },
  queries: {},
});

const variables = {
  search: searchVariable({ key: 'q', label: 'Search customers' }),
  country: dimensionFilter<string>({
    key: 'country',
    label: 'Country',
    valueType: 'string',
    selectionMode: 'multiple',
    options: [
      { value: 'FR', label: 'France' },
      { value: 'UK', label: 'United Kingdom' },
      { value: 'DE', label: 'Germany' },
    ],
  }),
  segment: dimensionFilter<string>({
    key: 'segment',
    label: 'Segment',
    valueType: 'string',
    selectionMode: 'single',
    options: [
      { value: 'Enterprise', label: 'Enterprise' },
      { value: 'Growth', label: 'Growth' },
    ],
  }),
  active: booleanFilter({
    key: 'active',
    label: 'Active account',
    presentation: { prominence: 'secondary' },
  }),
  billing: dimensionFilter<string>({
    key: 'billing',
    label: 'Billing status',
    valueType: 'string',
    selectionMode: 'single',
    options: [
      { value: 'Current', label: 'Current' },
      { value: 'Overdue', label: 'Overdue' },
    ],
    presentation: { prominence: 'secondary' },
  }),
  owner: dimensionFilter<string>({
    key: 'owner',
    label: 'Account owner',
    valueType: 'string',
    selectionMode: 'multiple',
    options: [
      { value: 'Amira', label: 'Amira' },
      { value: 'Jonas', label: 'Jonas' },
      { value: 'Lea', label: 'Lea' },
    ],
    presentation: { prominence: 'secondary' },
  }),
  spend: numberFilter({
    key: 'spend',
    label: 'Monthly spend (€)',
    min: 0,
    defaultValue: { kind: 'comparison', operator: 'gte', value: 100 },
    presentation: { prominence: 'secondary' },
  }),
  orders: numberFilter({
    key: 'orders',
    label: 'Open orders',
    min: 0,
    max: 50,
    presentation: { prominence: 'secondary' },
  }),
  sort: choiceVariable({
    key: 'sort',
    label: 'Sort by',
    defaultValue: 'spend',
    options: [
      { id: 'spend', label: 'Monthly spend' },
      { id: 'name', label: 'Customer name' },
    ],
    presentation: { group: 'display' },
  }),
  direction: choiceVariable({
    key: 'direction',
    label: 'Order',
    defaultValue: 'desc',
    options: [
      { id: 'desc', label: 'Descending' },
      { id: 'asc', label: 'Ascending' },
    ],
    presentation: { group: 'display', prominence: 'secondary' },
  }),
};
type Input = AppVariableValues<typeof variables>;
const records = [
  {
    name: 'Atelier North',
    billing: 'Current',
    owner: 'Amira',
    orders: 3,
    country: 'FR',
    segment: 'Growth',
    active: true,
    spend: 420,
  },
  {
    name: 'Beacon Labs',
    billing: 'Current',
    owner: 'Jonas',
    orders: 12,
    country: 'UK',
    segment: 'Enterprise',
    active: true,
    spend: 2400,
  },
  {
    name: 'Cedar Studio',
    billing: 'Overdue',
    owner: 'Lea',
    orders: 0,
    country: 'DE',
    segment: 'Growth',
    active: false,
    spend: 180,
  },
  {
    name: 'Delta Works',
    billing: 'Current',
    owner: 'Amira',
    orders: 7,
    country: 'FR',
    segment: 'Enterprise',
    active: true,
    spend: 1850,
  },
  {
    name: 'Elm & Co',
    billing: 'Overdue',
    owner: 'Jonas',
    orders: 0,
    country: 'UK',
    segment: 'Growth',
    active: false,
    spend: 75,
  },
  {
    name: 'Foundry Team',
    billing: 'Current',
    owner: 'Lea',
    orders: 18,
    country: 'DE',
    segment: 'Enterprise',
    active: true,
    spend: 3200,
  },
  {
    name: 'Grove Partners',
    billing: 'Overdue',
    owner: 'Amira',
    orders: 1,
    country: 'FR',
    segment: 'Growth',
    active: false,
    spend: 290,
  },
  {
    name: 'Harbor Systems',
    billing: 'Current',
    owner: 'Jonas',
    orders: 4,
    country: 'UK',
    segment: 'Enterprise',
    active: true,
    spend: 980,
  },
];
function includes(selection: Input['country'], value: string) {
  if (selection.kind === 'all') return true;
  const selected = selection.members.some(
    member => member.kind === 'value' && member.value === value
  );
  return selection.kind === 'exclude' ? !selected : selected;
}
function matchesNumber(selection: Input['spend'], value: number) {
  if (selection.kind === 'all') return true;
  if (selection.kind === 'range')
    return (
      (selection.min === undefined || value >= selection.min) &&
      (selection.max === undefined || value <= selection.max)
    );
  switch (selection.operator) {
    case 'eq':
      return value === selection.value;
    case 'ne':
      return value !== selection.value;
    case 'gt':
      return value > selection.value;
    case 'gte':
      return value >= selection.value;
    case 'lt':
      return value < selection.value;
    case 'lte':
      return value <= selection.value;
  }
}
const operation = dataApp.defineOperation({
  input(value: unknown): Input {
    const input = value as Input;
    if (
      !input ||
      !variables.search.valid(input.search) ||
      !variables.sort.valid(input.sort) ||
      !variables.direction.valid(input.direction)
    )
      throw new Error('Invalid customer inputs');
    return {
      ...input,
      country: parseDimensionSelection(input.country, variables.country),
      segment: parseDimensionSelection(input.segment, variables.segment),
      active: parseBooleanSelection(input.active, variables.active),
      spend: parseNumberSelection(input.spend, variables.spend),
      billing: parseDimensionSelection(input.billing, variables.billing),
      owner: parseDimensionSelection(input.owner, variables.owner),
      orders: parseNumberSelection(input.orders, variables.orders),
    };
  },
  output: (value: unknown) => value as { rows: typeof records },
  checks: [
    Object.fromEntries(
      Object.entries(variables).map(([name, variable]) => [
        name,
        variable.defaultValue,
      ])
    ) as Input,
  ],
  policy: { maxQueryRows: 20, maxDurationMs: 1000 },
  async run(_context, input) {
    const rows = records
      .filter(
        row =>
          row.name
            .toLocaleLowerCase()
            .includes(input.search.toLocaleLowerCase()) &&
          includes(input.country, row.country) &&
          includes(input.segment, row.segment) &&
          includes(input.billing, row.billing) &&
          includes(input.owner, row.owner) &&
          (input.active.kind === 'all' || row.active === input.active.value) &&
          matchesNumber(input.spend, row.spend) &&
          matchesNumber(input.orders, row.orders)
      )
      .sort((left, right) => {
        const order =
          input.sort === 'name'
            ? left.name.localeCompare(right.name)
            : left.spend - right.spend;
        return input.direction === 'asc' ? order : -order;
      });
    return { rows };
  },
});
const client = createDataClient({
  operations: { customers: operation },
  lakehouse: {
    async queryAll() {
      return { columns: [], rows: [] };
    },
  },
});
const { defineDataView } = createDataHooks(client);
const displayOnly = new URLSearchParams(location.search).has('displayOnly');
const searchOnly = new URLSearchParams(location.search).has('searchOnly');
const view = defineDataView({
  operation: 'customers',
  variables: searchOnly
    ? { search: variables.search }
    : displayOnly
      ? {
          search: variables.search,
          sort: variables.sort,
          direction: variables.direction,
        }
      : variables,
  input: values => ({
    search: variables.search.defaultValue,
    sort: variables.sort.defaultValue,
    direction: variables.direction.defaultValue,
    country: { kind: 'all' as const },
    segment: { kind: 'all' as const },
    active: { kind: 'all' as const },
    spend: { kind: 'all' as const },
    billing: { kind: 'all' as const },
    owner: { kind: 'all' as const },
    orders: { kind: 'all' as const },
    ...values,
  }),
  dataContext: createDataContext({ customers: 'customers' })({
    description: 'Illustrative customer account records.',
    glossary: {},
  }),
  describeInput: input =>
    input.search ? `Customers matching “${input.search}”` : 'Customer accounts',
  isEmpty: () => false,
  emptyFallback: {
    title: 'No matching customers',
    description: 'Try a different search or clear filters.',
  },
});
const customers = view.dataset({
  name: 'Customers',
  select: data => data.rows,
  rowKey: row => row.name,
  columns: {
    name: { label: 'Customer', value: row => row.name },
    country: {
      label: 'Country',
      value: row =>
        ({ FR: 'France', UK: 'United Kingdom', DE: 'Germany' })[row.country] ??
        row.country,
    },
    segment: { label: 'Segment', value: row => row.segment },
    active: {
      label: 'Account',
      value: row => (row.active ? 'Active' : 'Inactive'),
    },
    spend: {
      label: 'Monthly spend',
      value: row => row.spend,
      format: { kind: 'currency', currency: 'EUR' },
    },
  },
  evidence: { id: 'customers', queryNames: ['customers'] },
  emptyFallback: {
    title: 'No matching customers',
    description: 'Try a different search or clear filters.',
  },
});
const content = view.content(source => (
  <TableWidget dataset={customers} source={source} pagination={false} />
));
function App() {
  return (
    <DataApp
      view={view}
      showSearch={!new URLSearchParams(location.search).has('hideSearch')}
      datasets={[customers]}
      story={snapshot => [
        {
          id: 'matching-customers',
          headline: `${snapshot.data.rows.length} customer accounts match this selection`,
          context:
            'Sample records, using the currently displayed search and filters.',
          visual: (
            <TextContent>
              <p>{snapshot.data.rows.length} matching accounts</p>
            </TextContent>
          ),
          evidence: customers,
        },
      ]}
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

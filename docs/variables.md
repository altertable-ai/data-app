# Variables and filters

## Time views and field filters

`createDataHooks(client).defineTimeView()` owns the `period` variable, calendar
controls, and displayed-period label. Declare `time: { contract, defaultValue }`,
an operation, `isEmpty` (a predicate), and `emptyFallback` (a title and optional
description for an empty result). With no additional variables, its default
input is the calendar request. With additional variables, it is `{ period, ...variables }`.
Supply an `input` mapper for a different operation shape and `bindings` to extract
nested period or field-filter inputs. Mappings must preserve the selected values.
Bindings are required when the operation input cannot supply a compatible
top-level filter field or the calendar request. Keep parsed selections in the
operation input and derive SQL parameters inside the operation.

`dimensionFilter()` from `/contract` requires exactly one option source: fixed `options` or a `facet`.
Use `defineFacetFilter()` to bind a facet operation and its typed input. `<DimensionPicker>` offers missing values separately and keeps selected values
available when they have zero matches.

## Declare controls once

Use `searchVariable()`, `choiceVariable()`, and `dateRangeVariable()` in a view's
`variables`. `<DataApp view={view}>` generates search, filters, and display options
and keeps their values in the URL.
Set `showSearch={false}` or `showFilters={false}` on `<DataApp>` to hide the
corresponding region while preserving its values; `showFilters` includes display options.

Keep local search out of the operation input when it only filters loaded rows.

### Search suggestions

Declaring dataset `suggestions` enables autocomplete automatically. Use it when
record titles are useful query completions; omit it for aggregate datasets or when
completion would not help. No additional enabling prop is needed.

The app-owned `customers` operation accepts `{ q: string }` and returns `{ rows }`.
With your typed `client` and registered `dataContext`, connect the query to its
records and widgets:

```tsx
const view = createDataHooks(client).defineDataView({
  dataContext,
  operation: 'customers',
  variables: {
    search: searchVariable({ key: 'q', label: 'Search customers' }),
  },
  input: ({ search }) => ({ q: search }),
  describeInput: ({ q }) => (q ? `Customers matching ${q}` : 'All customers'),
  isEmpty: () => false,
  emptyFallback: { title: 'No customers' },
});
const customers = view.dataset({
  name: 'Customers',
  select: data => data.rows,
  rowKey: row => row.id,
  columns: { name: { value: row => row.name } },
  evidence: { id: 'customers', queryNames: ['customers'] },
  suggestions: {
    title: row => row.name,
    description: row => row.country,
  },
});
const content = view.content(source => (
  <TableWidget dataset={customers} source={source} />
));

<DataApp view={view} datasets={[customers]} story={story}>
  <DataSection content={content} />
</DataApp>;
```

The first `searchVariable()` in declaration order is the primary search: it owns
autocomplete and combines supplied datasets that declare suggestions. Typing
updates the page and suggestions from the same displayed result. Capped or
paginated sources offer suggestions only for supplied rows. Title matches rank
ahead of description matches; the five suggestion slots are shared across datasets. Selection completes the query with
the title; `suggestions.onSelect: row => openCustomer(row.id)` overrides completion
with an app action. `showSearchSuggestions` defaults to true; set it to false to
suppress autocomplete for a particular app.

### Organize controls by intent

Declare controls in priority order for the user's task. Keep useful scope filters
visible and set `presentation.prominence: 'secondary'` for less frequent ones in
the Filters sheet. Active secondary filters remain available for direct editing.
Choose useful defaults rather than exposing every field; declare each label once.

Set `presentation.group: 'display'` for ordering or presentation choices. These
appear separately from scope filters. Search remains separate from both.

```ts
const active = booleanFilter({
  key: 'active',
  label: 'Active account',
  presentation: { prominence: 'secondary' },
});
const sort = choiceVariable({
  key: 'sort',
  label: 'Sort by',
  options: [{ id: 'name', label: 'Customer name' }],
  defaultValue: 'name',
  presentation: { group: 'display' },
});
```

The [date range contract](contract.md#shared-date-ranges) owns source coverage,
maximum range, time zone, and comparison rules. `defineTimeView()` is the compact
path for a view whose primary input is a period. Use `defineDataView()` for fixed
snapshots or other input shapes.

```ts
const activity = defineTimeView({
  dataContext,
  operation: 'activity',
  time: { contract: calendar, defaultValue: { kind: 'preset', id: 'last-7' } },
  variables: { region: searchVariable({ key: 'region' }) },
  input: values => ({
    filters: { period: values.period, region: values.region },
  }),
  bindings: {
    period: input => input.filters.period,
    region: input => input.filters.region,
  },
  isEmpty: data => data.rows.length === 0,
  emptyFallback: { title: 'No activity' },
});
```

The operation, calendar, and row shape are app-owned. Bindings must extract
selected values unchanged.

## URL state and custom controls

Relative date presets remain relative. Explicit dates use `start`, `end`, and
`compare` for the `period` variable; other date variables derive these keys from
their own key. Invalid URL values fall back to validated defaults. Do not use
reserved inspection, presentation, or navigation keys for app variables.

Choose push history for meaningful selections and replace history for typing.
Back/Forward restores the same values and controls. Use generated controls for
standard data apps. Direct pickers and standalone URL state belong to
[direct UI composition](ui.md).

## Fixed options and query-backed facets

Declare fixed choices with `dimensionFilter()` from `/contract`:

```ts
const region = dimensionFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'multiple',
  options: [{ value: 'Europe', label: 'Europe' }],
});
```

For query-backed choices use the hooks factory's `defineFacetFilter()`. The
facet operation returns parsed dimension options. Its input mapper uses current
resolved variables, including other filters:

```ts
const { defineFacetFilter } = createDataHooks(client);
const period = dateRangeVariable({
  key: 'period',
  contract: calendar,
  defaultValue: { kind: 'preset', id: 'last-7' },
});
const region = defineFacetFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'multiple',
  facet: {
    context: { period },
    operation: 'regions',
    input: values => ({ period: values.period }),
  },
});
```

Declare mapper dependencies in `facet.context` (`{}` for none), and include them
alongside the facet in the view's `variables`. Mapper inputs and option values are
inferred from the variables and operation; options must match `valueType`.
For the operation's input parser, use `parseDimensionSelection(value, region)` from `/contract`.
A dimension without an explicit selection represents all members.
Map parsed selections to the query's declared parameters; do not construct SQL
from filter values. Choose selection modes supported by the registered query.

Choose `selectionMode: 'single'` when one value replaces another and
`selectionMode: 'multiple'` for independent values. `All` is an explicit choice for a single-value
filter and the meaning of an empty selection for a multiple-value filter.
Single-value filters always have a selection limit of one.

## Fixed choices

`choiceVariable()` requires labeled `options` and a valid `defaultValue`.
`multiChoiceVariable()` stores unique option IDs with an optional selection limit.
Fixed-choice declarations need at least one option. Inline options or `as const`
preserve their IDs so TypeScript checks defaults against them. An empty selected
collection means no choices; categorical filters use `dimensionFilter()` when
an empty selection should mean all records.

```ts
const variables = {
  search: searchVariable({ key: 'q', label: 'Search' }),
  metric: choiceVariable({
    key: 'metric',
    label: 'Metric',
    defaultValue: 'orders',
    options: [
      { id: 'orders', label: 'Orders' },
      { id: 'revenue', label: 'Revenue' },
    ],
  }),
};
```

## Numeric and boolean predicates

Import `numberFilter()` and `booleanFilter()` from `/contract` and put their
results in the view's `variables`. Both have an explicit `{ kind: 'all' }`
unrestricted state. Numeric filters support inclusive, open-ended ranges and
comparisons: `eq`, `ne`, `gt`, `gte`, `lt`, and `lte`. Boolean filters distinguish
Any from `{ kind: 'is', value: true }` and `{ kind: 'is', value: false }`.

```ts
const amount = numberFilter({ key: 'amount', label: 'Amount', min: 0 });
const active = booleanFilter({ key: 'active', label: 'Active' });
```

Use `parseNumberSelection()` and `parseBooleanSelection()` in the operation's
input parser with the same filter declarations. Numeric predicates generate `<NumberFilterPicker>` panels. Draft edits reach
operation input only after Apply; Cancel and dismissal preserve the applied
value. Invalid ranges disable Apply.
Input mappings and bindings must preserve these predicates unchanged, as with
categorical filters. Map parsed operators and values to declared query parameters;
offer only operators supported by the registered query.

## Exclusion, clear, and reset

Set `allowExclusion: true` on `dimensionFilter()` to support
`{ kind: 'exclude', members }`. `<DimensionPicker>` then exposes Include/Exclude
alongside selected members. Enable exclusion only when the registered query supports
it, including the intended behavior for missing values.

Clear removes predicate filters while preserving search and display settings.
Clear search separately in its field.
`resetAll()` restores all
configured variable defaults, including fixed choices and periods. Nonempty
default filters can therefore be active immediately after Reset.

Direct `useAppVariables()` callers can use `clearAll()` and `resetAll()`. `<FilterActions>` also supports app-owned draft state
with paired Apply/Cancel handlers; derive queries and visible controls from applied
values while a draft is being edited.

Filters apply immediately; use app-owned drafts only when the task needs Apply/Cancel.

# Variables and filters

## Time views and field filters

`createDataHooks(client).defineTimeView()` owns the `period` variable, calendar
controls, and displayed-period label. Declare `time: { contract, defaultValue }`,
an operation, `isEmpty` (a predicate), and `emptyFallback` (a title and optional
description for an empty result). With no additional variables, its default
input is the calendar request. With additional variables, it is `{ period, ...variables }`.
Supply an `input` mapper for a different operation shape and `bindings` to extract
nested period or field-filter inputs. Mappings must preserve the selected values.

`dimensionFilter()` from `/contract` requires exactly one option source: fixed `options` or a `facet`.
Use `defineFacetFilter()` to bind a facet operation and its typed input. `<DimensionPicker>` offers missing values separately and keeps selected values
available when they have zero matches.

## Declare controls once

Use `searchVariable()`, `choiceVariable()`, and `dateRangeVariable()` in a view's
`variables`. `<DataApp view={view}>` generates their controls and keeps values in the URL.
Keep local search out of the operation input when it only filters loaded rows.

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
facet operation returns parsed dimension options. Its input mapper reads current
resolved variables, including other filters:

```ts
const { defineFacetFilter, defineTimeView } = createDataHooks(client);
const region = defineFacetFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'multiple',
  facet: {
    operation: 'regions',
    input: values => ({ period: values.period as DateRangeRequest }),
  },
});
```

The client registry defines the `regions` operation and its typed period input;
import `DateRangeRequest` from `/contract`. Put `region` in the view's `variables`
alongside its period. Use `parseFacetOptions()` to validate facet results, and
`dimensionPredicate()` to build a bounded SQL filter from parsed selections.
For the operation's input parser, use `parseDimensionSelection(value, region)` from `/contract`.
A dimension without an explicit selection represents all members.

Choose `selectionMode: 'single'` when one value replaces another. Its picker closes
after choosing a value and shows a checkmark for the current choice. Use
`selectionMode: 'multiple'` for independent values; checkbox indicators and an open
popup allow repeated selections. `All` is an explicit choice for a single-value
filter and the meaning of an empty selection for a multiple-value filter.

## Fixed choices

`choiceVariable()` requires labeled `options` and a valid `defaultValue`.
`multiChoiceVariable()` stores unique option IDs with an optional selection limit.
An empty fixed-choice collection means no choices; categorical filters use
`dimensionFilter()` when an empty selection should mean all records.

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

Fixed single choices generate `<Select>`; multiple choices generate
`<ChoicePicker selectionMode="multiple">`. Direct controls can present the same
values as radio groups, checkbox groups, or segmented choices without changing
URL state.

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
categorical filters. Use the parsed operator and values to build the app's
bounded query.

## Exclusion, clear, and reset

Set `allowExclusion: true` on `dimensionFilter()` to support
`{ kind: 'exclude', members }`. `<DimensionPicker>` then exposes Include/Exclude
alongside selected members. `dimensionPredicate()` retains missing records when
excluding named values; selecting the missing member excludes missing records.

Generated controls show active values within each filter and one collective
Clear icon with a tooltip. Clear removes restrictions from search and predicate filters.
`resetAll()` restores all
configured variable defaults, including fixed choices and periods. Nonempty
default filters can therefore be active immediately after Reset.

Direct `useAppVariables()` callers can use `clearAll()` and `resetAll()` for one
atomic history update. `<FilterActions>` also supports app-owned draft state
with paired Apply/Cancel handlers; derive queries and visible controls from applied
values while a draft is being edited.

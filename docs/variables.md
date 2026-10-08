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

Use `textVariable()`, `selectVariable()`, and `dateRangeVariable()` in a view's
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
  variables: { region: textVariable({ key: 'region' }) },
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
  selection: 'multiple',
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
  selection: 'multiple',
  facet: {
    operation: 'regions',
    input: values => ({ period: values.period as DateRangeRequest }),
  },
});
```

The client registry defines the `regions` operation and its typed period input;
import `DateRangeRequest` from `/contract`. Put `region` in the view's `variables`
alongside its period. Use `parseFacetOptions()` to validate facet results.
Bind a parsed selection as scalar parameters: whether it includes all members,
the selected values as a JSON string, and whether it includes missing values,
such as `$all OR list_contains(from_json($regions, '["VARCHAR"]'), region) OR ($missing AND region IS NULL)`.
For the operation's input parser, use `parseDimensionSelection(value, region)` from `/contract`.
A dimension without an explicit selection represents all members.

# Variables and filters

Declare controls once in the view's `variables`; `<DataApp view={view}>` renders
them and owns URL state. Use flat operation inputs matching variable names and
resolved types. Derive SQL parameters inside the operation.

## Declare controls once

The starter's operation accepts `{ groupName: string }`, so it needs no `input`
mapper or explicit `bindings`:

```ts
const sampleCountsView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  variables: {
    groupName: searchVariable({
      key: 'group',
      label: 'Group',
      defaultValue: '',
    }),
  },
  describeInput: ({ groupName }) =>
    groupName ? `group ${groupName}` : 'all groups',
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No matching groups' },
});
```

Keep search local only when it filters already loaded rows. Add dataset
`suggestions` when record names make useful query completions; suggestions cover
supplied rows only.

## Independent filters and chart breakdowns

For source-backed categorical members, use `dataApp.defineDimension()`:

```ts
const group = dataApp.defineDimension({
  key: 'group',
  label: 'Group',
  valueType: 'string',
  selectionMode: 'multiple',
  source: { query: 'groups' },
});
const parseInput = variableInput(parseEmptyInput, { group });
```

Import `variableInput()` and `parseEmptyInput()` from `/contract`. Use `parseInput`
on the operation and declare the same `group` in the view's `variables`. Use an
app-owned base parser instead of `parseEmptyInput()` for other input fields.

Declare the source query in `defineDataApp()` with a nullable `member` parameter
matching `valueType`. Its nonnullable projections are `value` (same type),
`label` (string), and optional `count` (number). Null requests options; a selected
member requests exact lookup. Other parameters need defaults or trusted values:

```sql
SELECT DISTINCT group_name AS value, group_name AS label
FROM sample_counts
WHERE ($member IS NULL OR group_name = $member)
ORDER BY label
```

Here `sample_counts` is the inspected table replacing the starter's fixture.
Validate these variables in every consuming operation, including details. Map
parsed predicates to declared query parameters; never interpolate filter values
into SQL. Each dimension is independent: changing one preserves other selections,
even when their combination returns no rows. No selection means all members.

### Chart breakdowns

Use `choiceVariable()` for a display choice, separately from population filters:

```ts
const countsBy = choiceVariable({
  key: 'counts-by',
  label: 'Counts breakdown',
  defaultValue: 'group',
  options: [
    { id: 'group', label: 'Group' },
    { id: 'country', label: 'Country' },
  ],
  presentation: { group: 'display', control: 'widget' },
});
```

Pass `view.breakdown('countsBy')` to `<VisualizationWidget breakdown={...}>`.
Declare a separate choice for each independently controlled chart.
Use `presentation.prominence: 'secondary'` for less frequent scope filters.

## Fixed options and query-backed facets

Use `dimensionFilter()` from `/contract` when options are known constants:

```ts
const group = dimensionFilter({
  key: 'group',
  label: 'Group',
  valueType: 'string',
  selectionMode: 'multiple',
  options: [
    { value: 'Alpha', label: 'Alpha' },
    { value: 'Beta', label: 'Beta' },
  ],
});
```

Use `defineFacetFilter()` only when options must depend on other selections:

```ts
const group = defineFacetFilter({
  key: 'group',
  label: 'Group',
  valueType: 'string',
  selectionMode: 'multiple',
  facet: {
    context: { period },
    operation: 'groups',
    input: values => ({ period: values.period }),
  },
});
```

Obtain `defineFacetFilter()` from the existing hooks factory. Declare `period`
with `dateRangeVariable()`, include it alongside `group` in the view's variables,
and return parsed dimension options from the `groups` operation. Validate facet
selections with `parseDimensionSelection(value, group)` from `/contract`.

Use `single` for a replacement choice and `multiple` for independent members.
Enable `allowExclusion` only when the query supports exclusion and its intended
missing-value behavior. Use `multiChoiceVariable()` for fixed multiselect
choices; empty means no choices, unlike an unrestricted dimension.

## Reporting periods

Use `defineTimeView()` when the analysis is period-driven. Obtain it from the
existing hooks factory and share a `defineDateRangeContract()` with the parser.
After adapting the operation to accept `{ period, groupName }`, the view can stay
flat:

```ts
const dailyCountsView = defineTimeView({
  dataContext: dailyCountsContext,
  operation: 'dailyCountsByGroup',
  time: { contract: calendar, defaultValue: { kind: 'preset', id: 'last-7' } },
  variables: {
    groupName: searchVariable({
      key: 'group',
      label: 'Group',
      defaultValue: '',
    }),
  },
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No matching groups' },
});
```

The operation's parser validates `period` with `calendar.parseRequest()`.
Without additional variables, the default input is the calendar request itself.
Use `defineDataView()` for fixed snapshots or analysis without a reporting period.

## Numeric and boolean predicates

Use `numberFilter()` or `booleanFilter()` from `/contract` for field predicates.
Declare them in `variables` and validate input with `parseNumberSelection()` or
`parseBooleanSelection()` using the same declarations. Both support
`{ kind: 'all' }`. Offer only predicates the registered query supports.

## Exclusion, clear, and reset

Clear removes scope predicates and returns dates to defaults, preserving search
and display choices. `resetAll()` restores all defaults. Filters apply immediately;
use app-owned drafts only when the task needs Apply/Cancel.

## Adapt existing input shapes

Add a mapper and bindings only when an existing operation requires nested or
differently named inputs. Preserve selected values unchanged in both directions:

```ts
input: values => ({ filters: { period: values.period, groupName: values.groupName } }),
bindings: {
  period: input => input.filters.period,
  groupName: input => input.filters.groupName,
},
```

Custom control ownership is needed only when generated controls cannot express
the requirement; use `/ui` for that case. Do not reuse reserved inspection,
presentation, or navigation URL keys.

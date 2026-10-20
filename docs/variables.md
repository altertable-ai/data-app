# Variables and filters

Declare controls once in a view's `variables`. `<DataApp view={view}>` renders
them and keeps values in the URL. Expose useful scope choices, not every field.
Keep local search out of operation input when it only filters loaded rows.

| Need                                               | Declaration                                            |
| -------------------------------------------------- | ------------------------------------------------------ |
| Search text                                        | `searchVariable()`                                     |
| Display choice, such as sort or metric             | `choiceVariable()` or `multiChoiceVariable()`          |
| Reporting period                                   | `defineTimeView()` or `dateRangeVariable()`            |
| Fixed categorical options                          | `dimensionFilter()` from `/contract`                   |
| Options dependent on other variables               | `defineFacetFilter()` from the hooks factory           |
| Independent source options and exact member lookup | `app.defineDimension()`                                |
| Numeric or boolean predicate                       | `numberFilter()` or `booleanFilter()` from `/contract` |

## Declare controls once

Use `defineTimeView()` when the primary input is a reporting period. Share the
[date contract](contract.md#shared-date-ranges) with the operation parser.
Its default input is the calendar request, or `{ period, ...variables }` when
additional variables exist. Use `defineDataView()` for other input shapes.

For nested inputs, map selections into operation input and extract them unchanged
with `bindings`:

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

Derive SQL parameters inside the operation. Keep the selected values intact in
operation input so the view can describe the displayed scope.

### Organize controls by intent

Declare controls in priority order. Use `presentation.prominence: 'secondary'`
for less frequent scope filters and `presentation.group: 'display'` for ordering
or presentation choices. Give fixed choices labeled options and a valid default:

```ts
const revenueBy = choiceVariable({
  key: 'revenue-by',
  label: 'Revenue breakdown',
  defaultValue: 'region',
  options: [
    { id: 'region', label: 'Region' },
    { id: 'country', label: 'Country' },
  ],
  presentation: { group: 'display', control: 'widget' },
});
```

Pass `view.breakdown('revenueBy')` to `<VisualizationWidget breakdown={...}>`.
`control: 'widget'` places the choice in that widget. Declare separate choices
when charts should be controlled independently.

### Search suggestions

Declare `suggestions: { title: row => row.name, description: row => row.country }`
on a dataset when record names make useful search completions. The primary
search uses supplied datasets; capped or paginated sources suggest only supplied
rows. Set `suggestions.onSelect` for an app action instead of query completion.

## Fixed options and query-backed facets

Use `dimensionFilter()` for fixed options:

```ts
const region = dimensionFilter({
  key: 'region',
  label: 'Region',
  valueType: 'string',
  selectionMode: 'multiple',
  options: [{ value: 'Europe', label: 'Europe' }],
});
```

Use `defineFacetFilter()` when options depend on current variables:

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

The facet operation returns parsed dimension options matching `valueType`.
Declare mapper dependencies in `facet.context` (`{}` for none), then include them
alongside the facet in the view's `variables`. Validate operation input with
`parseDimensionSelection(value, region)`.

A dimension with no selection means all members. Use `single` for a replacement
choice and `multiple` for independent values. Fixed `multiChoiceVariable()`
selections differ: an empty collection means no choices.
Enable `allowExclusion` only when the query supports exclusion and its intended
missing-value behavior. Map predicates to declared query parameters; never build
SQL from filter values.

## Independent filters and chart breakdowns

Use `app.defineDimension()` for source-backed options independent of other filters:

```ts
const country = app.defineDimension({
  key: 'country',
  label: 'Country',
  valueType: 'string',
  selectionMode: 'single',
  source: { query: 'countries' },
});
const parseInput = variableInput(parsePeriodInput, { country, revenueBy });
```

Import `variableInput()` from `/contract` and use it on every operation consuming
these variables, including details. Declare the same variables on the view.

The source query needs a nullable `member` parameter matching `valueType` and
nonnullable projections for `value` (same type), `label` (string), and optional
`count` (number). Null requests options; a selected value requests exact lookup.
Other parameters need defaults or trusted server values:

```sql
SELECT code AS value, name AS label
FROM countries
WHERE ($member IS NULL OR code = $member)
ORDER BY name
```

Keep SQL and parameter declarations literal in `defineDataApp()`. Picker search
covers supplied options only. Filters combine independently: changing Region
preserves Country, even if the combination returns no rows. Breakdown choices
change the displayed grouping separately from population filters.

## Numeric and boolean predicates

Put `numberFilter()` and `booleanFilter()` in the view's `variables` and validate
input with `parseNumberSelection()` and `parseBooleanSelection()` using the same
declarations. Both support `{ kind: 'all' }`. Numeric filters support comparisons
and inclusive open-ended ranges; booleans distinguish Any, true, and false.

```ts
const amount = numberFilter({ key: 'amount', label: 'Amount', min: 0 });
const active = booleanFilter({ key: 'active', label: 'Active' });
```

Preserve predicates in input mappings and bindings. Offer only operators the
registered query supports.

## Exclusion, clear, and reset

Clear removes scope predicates and returns dates to defaults, preserving search
and display choices. `resetAll()` restores all variable defaults. Filters apply
immediately; use app-owned drafts only when the task needs Apply/Cancel.

## URL state and custom controls

Use generated controls for standard apps. Invalid URL values fall back to
validated defaults; do not reuse reserved inspection, presentation, or navigation
keys. For custom ownership, see [direct UI composition](ui.md).

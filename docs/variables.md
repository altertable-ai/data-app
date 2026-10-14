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
the Filters sheet. A floating bar summarizes active filters; each summary opens the Filters sheet.
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

### Control surfaces

| Control intent           | Top bar                              | Filters sheet                      | Floating active-filter bar                     |
| ------------------------ | ------------------------------------ | ---------------------------------- | ---------------------------------------------- |
| Search                   | Separate search field                | No                                 | No                                             |
| Scope, primary (default) | Direct control                       | Yes                                | When different from its clear value or default |
| Scope, secondary         | Filters button opens sheet           | Yes                                | When different from its clear value or default |
| Hierarchy                | Filters button opens sheet           | Progressive parent/child selectors | Selected members, never All levels             |
| Display                  | Display options button opens popover | No                                 | No                                             |

The same scope rule covers date ranges, fixed choices, multiple choices,
dimensions, numeric predicates, and boolean predicates. `presentation.group`
chooses scope or display; `presentation.prominence` chooses primary or secondary.
Display controls all live in their own popover, ordered primary before secondary.
Hierarchy levels belong to one variable and cannot also be declared as ordinary
filters. Search keeps its separate input and suggestions.

The floating summaries open the same Filters sheet; they do not own another
selection state. Clear removes clearable predicates and resets hierarchy scope
and grouping. Periods and fixed choices without a clear value retain their current
values, as do search and display options. Reset restores configured defaults.

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

The client's operation map defines `regions` and its typed period input;
import `DateRangeRequest` from `/contract`. Put `region` in the view's `variables`
alongside its period. Use `parseFacetOptions()` to validate facet results.
For the operation's input parser, use `parseDimensionSelection(value, region)` from `/contract`.
A dimension without an explicit selection represents all members.
Map parsed selections to the query's declared parameters; do not construct SQL
from filter values. Choose selection modes supported by the registered query.

Choose `selectionMode: 'single'` when one value replaces another and
`selectionMode: 'multiple'` for independent values. `All` is an explicit choice for a single-value
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

## Hierarchical exploration

Declare one hierarchy variable for dimensions that share a hierarchy. Use
`explorationVariable()` for static options and `app.defineExploration()` for
query-backed levels. Its single URL value owns typed `selection` and `groupBy`. Do not also declare those
levels as ordinary filters. Dates, segments, and other scope remain independent.

```tsx
const geography = explorationVariable({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      groupLabel: 'Regions',
      valueType: 'string',
      options: regionOptions,
    },
    {
      id: 'country',
      label: 'Country',
      groupLabel: 'Countries',
      valueType: 'string',
      options: countryOptions,
    },
    {
      id: 'customer',
      label: 'Customer',
      groupLabel: 'Customers',
      valueType: 'number',
      options: customerOptions,
    },
  ],
});

const salesView = defineDataView({
  operation: 'sales',
  dataContext,
  variables: { period, geography },
  describeInput: describeSalesScope,
  isEmpty: data => data.rows.length === 0,
  emptyFallback: { title: 'No matching places' },
});
const exploration = salesView.exploration('geography');
```

The operation preserves `{ period, geography }`. Validate geography with
`geography.parse()` and derive query predicates from its selection and grouping
from `input.geography.groupBy`. Labels come from options or facet results;
IDs alone supply predicates. For nested or renamed input fields, provide typed
`bindings` as with other scope variables.

Each level selects All or one member using the existing dimension selection
shape. Static options can declare their immediate `parent` ID. Selector
visibility follows selected parents independently of grouping: Region All shows
only Region; Europe reveals Country All; selecting a country reveals Customer
All. Selecting All clears and hides descendants. `geography.visibleLevels(state)`
derives controls; `geography.level(state)` derives grouping.

The bound target’s `exploration.filter({ country: null })` clears that level to All.
For a standalone variable, use `geography.filter(state, { country: null })`. Stored state
uses `{ kind: 'all' }`, not a null member ID. A null SQL parameter can represent
unrestricted scope through `($country IS NULL OR country = $country)`. Selecting
missing database values is a separate operation; hierarchies currently support
single string or numeric members.

### Source-backed hierarchies

Use `app.defineExploration()` for query-backed levels. Declare each relationship
once in a registered query; the platform reuses it for dropdown options and
selected-member validation. Each source query declares `member` and returns
`value`, `label`, and optionally `count`:

```sql
SELECT id AS value, name AS label
FROM countries
WHERE region = $region AND ($member IS NULL OR id = $member)
ORDER BY name
```

```tsx
const geography = app.defineExploration({
  key: 'geography',
  label: 'Geography',
  levels: [
    {
      id: 'region',
      label: 'Region',
      valueType: 'string',
      options: regionOptions,
    },
    {
      id: 'country',
      label: 'Country',
      valueType: 'string',
      source: {
        query: 'countries',
      },
    },
  ],
});

const operations = {
  overview: app.defineOperation({
    input: geography.input(parsePeriodInput),
    // Existing output, checks, policy, and run definitions.
  }),
};
```

Ancestor IDs bind automatically to matching query parameter names. When names
differ, declare a typed map such as `parents: { regionId: 'region' }` in the
source. Bindings can reference only earlier levels and declared query parameters;
each child source must bind its immediate parent.
The platform owns `member`: null requests bounded dropdown options; a selected
ID requests an exact lookup. Apply both ancestor predicates and the member
predicate in source SQL. Do not paginate the exact-member lookup or validate
against the dropdown page: valid IDs may lie outside its first 200 options.
The platform resolves selected labels independently and shares them between the
Filters sheet and floating summary, even when the options page fails. Unknown
counts are omitted rather than reported as zero. No manual label lookup is needed.
Dropdown search filters loaded options; it does not fetch additional members.

Use `geography.input(baseParser)` for every operation consuming that hierarchy,
including details. It parses the named field and attaches source validation.
Clients and HTTP handlers automatically register the required selector operations
from these input contracts and reject conflicting operation names. No selector
registration spread or manual parent check is needed. Input wrappers compose for
several hierarchies. `geography.parse()` alone is structural UI validation.

The shared executor validates selected source members in parent order before
business queries, using the current operation's authorization, cancellation,
and limits. Invalid or stale membership returns an invalid-input error; source
failures prevent the business operation from running. Lookup queries appear in
query evidence. Both browser/bundle and HTTP execution use this contract. Generated selector endpoints are named
`key.level` and pass through the same authorization callback as ordinary
operations. Child selectors require selected ancestors and validate their
membership before querying child labels. These names are reserved. `hierarchy.operations` is available when
an authorizer needs to inspect its selector names.

See the [support workload example](https://github.com/altertable-ai/data-app/blob/main/dev/support.ts)
for the complete source, parser, and operation declarations.

| Interaction                             | Result                                                   |
| --------------------------------------- | -------------------------------------------------------- |
| Select a different parent               | Clear descendants and retain the deepest valid grouping. |
| Filter a chart member                   | Select that member; preserve grouping.                   |
| Descend a chart member                  | Select that member and advance one level.                |
| Choose Group by in an ancestor dropdown | Group by that level and clear deeper selections.         |
| Select All at the root                  | Reset exploration.                                       |

`<DataApp>` includes progressive hierarchy selectors in the Filters sheet.
Each level opens one dropdown for its label and value. An ancestor dropdown
also offers Group by to return to that grouping. The floating active-filter bar
summarizes selected members using their facet labels. Clicking a summary opens
the sheet. Widgets do not repeat hierarchy selectors. Each transition creates
one history entry and preserves unrelated variables. Clear filters clears ordinary
predicates and resets hierarchy selections and grouping, preserving dates, search,
and display settings.

Use `action.filter()` and `action.descend()` with the bound exploration target;
see [widget actions](widgets.md#explore-from-widgets). Hierarchy row actions wait
until displayed and applied exploration agree. The filter bar and sheet show applied state; widgets keep displayed context during refreshes. Derive queries, titles, scope,
CSV, and stories from the same displayed input.

# Variables and filters

Declare controls once in the view's `variables`; `<DataApp view={view}>` renders
them and owns URL state. Use flat operation inputs matching variable names and
resolved types. Derive SQL parameters inside the operation.

## Declare controls once

The starter's operation accepts `{ groupName: string }`, so it needs no `input`
mapper or explicit `bindings`:

```ts
// ... client and sampleDataContext
const { defineDataView } = createDataHooks(client);

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
// ... dataApp with its registered groups query
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
// ... client and period variable
const { defineFacetFilter } = createDataHooks(client);

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

Declare `period` with `dateTimeRangeVariable()`, include it alongside `group` in the view's variables,
and return parsed dimension options from the `groups` operation. Validate facet
selections with `parseDimensionSelection(value, group)` from `/contract`.

Use `single` for a replacement choice and `multiple` for independent members.
Enable `allowExclusion` only when the query supports exclusion and its intended
missing-value behavior. Use `multiChoiceVariable()` for fixed multiselect
choices; empty means no choices, unlike an unrestricted dimension.

## Reporting periods

Use `defineTimeView()` when the analysis is period-driven. Declare a
`dateTimeRangeVariable()` and share its `defineDateRangeContract()` with the
operation parser. Datetime bounds include `from` and exclude `to`; the `period`
URL value stores the datetime selection. After adapting the operation to accept
`{ period, groupName }`, the view can stay flat:

```ts
// ... client, dailyCountsContext, and calendar contract
const { defineTimeView } = createDataHooks(client);
const period = dateTimeRangeVariable({
  key: 'period',
  contract: calendar,
  defaultValue: {
    from: new Date('2026-03-04T00:00:00Z'),
    to: new Date('2026-03-11T00:00:00Z'),
  },
});

const dailyCountsView = defineTimeView({
  dataContext: dailyCountsContext,
  operation: 'dailyCountsByGroup',
  time: period,
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

The operation's parser validates `period` with `period.parse()` or
`period.parseInput()` when comparison is enabled. Resolved comparison requests
have exclusive `range.to` and `comparison.to` bounds.
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
// ... client; operation input is { filters: { period, groupName } }
const { defineTimeView } = createDataHooks(client);

const dailyCountsView = defineTimeView({
  // ... operation, dataContext, time, variables, isEmpty, and emptyFallback
  input: values => ({
    filters: { period: values.period, groupName: values.groupName },
  }),
  bindings: {
    period: input => input.filters.period,
    groupName: input => input.filters.groupName,
  },
});
```

Custom control ownership is needed only when generated controls cannot express
the requirement; use `/ui` for that case. Do not reuse reserved inspection,
presentation, or navigation URL keys.

## Absolute and relative datetime ranges

Use `dateTimeRangeVariable()` for calendar days, times, rolling windows, or
mixed absolute and relative bounds. Share the variable between the operation parser and the view;
`<DataApp>` supplies the picker and URL state:

```ts
import {
  dateTimeRangeVariable,
  dateTimeRangePresets,
  defineDateRangeContract,
  variableInput,
} from '@altertable/data-app/contract';
import { createDataHooks } from '@altertable/data-app-react';

const calendar = defineDateRangeContract({
  maxRangeDays: 366,
  timeZone: 'UTC',
  completeDays: false,
});
const period = dateTimeRangeVariable({
  key: 'period',
  contract: calendar,
  allowComparison: true,
  defaultValue: '30d',
  presets: [
    ...dateTimeRangePresets.analytics,
    { label: 'Past 6 months', range: '6mo', shortcut: '6mo' },
  ],
});
const events = dataApp.defineOperation({
  input: variableInput(() => ({}), { period }),
  checks: [{ period: period.input(period.defaultValue) }],
  policy: { maxQueryRows: 1000, maxDurationMs: 15000 },
  async run({ query }, input) {
    const current = await query('events', { period: input.period.range });
    const previous = input.period.comparison
      ? await query('events', { period: input.period.comparison })
      : null;
    return { current: current.rows, previous: previous?.rows ?? null };
  },
});
// ... client created from { events }, and eventsContext
const { defineTimeView } = createDataHooks(client);
const eventsView = defineTimeView({
  operation: 'events',
  dataContext: eventsContext,
  time: period,
  isEmpty: result => result.current.length === 0,
  emptyFallback: { title: 'No events' },
});
```

Use `dateTimeRangePresets.monitoring` for shorter windows. Bind the query bounds
to a [datetime parameter](contract.md#bind-datetime-ranges).
`allowComparison: true` adds the toggle and supplies current/previous ranges resolved
against one reference time; the view derives metric comparison labels from that
request. Omit `comparison` for a plain `DateTimeRange` input, and omit `contract`
when no shared reporting policy is needed. Relative selections stay relative
across reloads. Query `from` inclusively and `to` exclusively. A September 24–30
calendar selection uses `2026-09-24T00:00:00Z` through `2026-10-01T00:00:00Z`.

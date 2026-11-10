# Filters and display options

Declare each filter once as a constant, then list it in `filters` on every
operation that reads it. The operation's input parser and checks, its view's
reporting period and scope, and the controls and URL state that `<DataApp>`
renders all derive from that list. Import filter constructors and types from
`@altertable/data-app/contract`.

## Declare filters on operations

The hosted starter's operations both read one group search:

```tsx
import { parseCount, searchFilter } from '@altertable/data-app/contract';

// ... dataApp, sampleDataContext, and section contents
const groupName = searchFilter({ key: 'group', label: 'Group' });

const operations = {
  sampleCountsByGroup: dataApp.defineOperation({
    filters: { groupName },
    policy: { maxQueryRows: 10, maxDurationMs: 15000 },
    async run({ query }, { groupName }) {
      const result = await query('sampleCountsByGroup', { groupName });
      return result.rows.map(row => ({
        groupName: row.group_name,
        sampleCount: parseCount(row.sample_count),
      }));
    },
  }),
  // ... sampleTotal reads the same { groupName }
};
const { defineView } = createDataHooks(createDataClient({ operations }));
const sampleCountsView = defineView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No matching groups' },
});

function App() {
  return (
    <DataApp view={sampleCountsView}>
      <DataSection content={countsContent} />
    </DataApp>
  );
}
```

`<DataApp>` renders one control for every filter any of the client's operations
reads. Share the same constant across operations: two different filters under
one name fail. URL keys must be unique. Omit `filters` for an operation without
inputs. An operation with its own fields, such as a detail record ID, adds an
`input` parser and `checks` for those fields only; it still lists the displayed
filters it reads in `filters`, which parse themselves.

A view's scope defaults to its reporting period, then the label and value of each
filter narrowed from its unrestricted value, such as `group Alpha`, or
`all data`; it reads inside sentences like “Showing group Alpha”. Pass `describeInput` to `defineView()` only when the scope needs
specific copy.

Keep search local only when it filters already loaded rows. Add dataset
`suggestions` when record names make useful query completions; suggestions cover
supplied rows only.

## Read filter values

`run(context, input)` receives one field per declared filter:

| Filter                                                 | Input value                                                |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `searchFilter()`                                       | `string`, at most `maxLength` (200 by default)             |
| `choiceFilter()`, `displayChoice()`                    | Selected option ID                                         |
| `multiChoiceFilter()`                                  | Selected option IDs                                        |
| `dimensionFilter()`, `facetFilter()`, source dimension | `DimensionSelection`                                       |
| `numberFilter()`, `booleanFilter()`                    | `NumberSelection`, `BooleanSelection`                      |
| `dateRangeFilter()`                                    | `DateRangeRequest` (`{ range, comparison }`)               |
| `dateTimeRangeFilter()`                                | `DateTimeRange`                                            |
| `dateTimeRangeFilter({ allowComparison: true })`       | `DateTimeRangeComparisonRequest` (`{ range, comparison }`) |

Inputs are validated against the filters before `run()`. Pass values to declared
query parameters inside `run()`; never interpolate filter values into SQL.
Date ranges bind as [range parameters](contract.md#bind-date-ranges). A
`DimensionSelection` binds whole to a `{ type: 'dimension', valueType }`
parameter, and `$country.matches(column)` keeps the rows it selects, including
multiple members, missing values, and exclusion:

```ts
// ... in defineDataApp({ queries })
revenueByCampaign: {
  statement: `SELECT o.campaign, sum(o.amount) AS revenue
    FROM demo.orders o JOIN demo.customers c ON c.id = o.customer_id
    WHERE $country.matches(c.country)
    GROUP BY o.campaign`,
  params: { country: { type: 'dimension', valueType: 'string' } },
  projections: { campaign: { type: 'string' }, revenue: { type: 'number' } },
},
// ... in the operation: query('revenueByCampaign', { country: input.country })
```

Dimension, number, and boolean selections support `{ kind: 'all' }`. Offer only
predicates the registered query supports.

## Categorical dimensions

For source-backed members, use `dataApp.defineDimension()`:

```ts
// ... dataApp with its registered groups query
const group = dataApp.defineDimension({
  key: 'group',
  label: 'Group',
  valueType: 'string',
  selectionMode: 'multiple',
  source: { query: 'groups' },
});
```

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
Operations reading `group` check selected members against this source before
`run()`. Use `dimensionFilter()` when options are known constants:

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

Set `defaultValue` to start from a narrower selection, such as
`{ kind: 'include', members: [{ kind: 'value', value: 'paid' }] }`; clearing
filters still returns to every member.

Each dimension is independent: changing one preserves other selections, even
when their combination returns no rows. No selection means all members. Use
`single` for a replacement choice and `multiple` for independent members. Enable
`allowExclusion` only when the query supports exclusion and its intended
missing-value behavior. Use `multiChoiceFilter()` for fixed multiselect choices;
empty means no choices, unlike an unrestricted dimension.

## Facet filters

Use `facetFilter()` only when options must follow other selections:

```ts
// ... period filter
const group = facetFilter({
  key: 'group',
  label: 'Group',
  valueType: 'string',
  selectionMode: 'multiple',
  options: 'groupOptions',
});
const operations = {
  groupOptions: dataApp.defineOperation({
    filters: { period },
    // ... policy, and run() returning DimensionOption[] for the period
  }),
  groupCounts: dataApp.defineOperation({
    filters: { period, group },
    // ... policy and run()
  }),
};
```

`options` names a registered operation; its own filters decide which selections
narrow the options. Here, changing `period` reloads the group options. Return
`{ value, label, count? }[]` directly from `run()`: at most 200 distinct values,
and `count` is the number the picker shows beside each option, such as the
records it would keep. Selections are checked for shape on the server, not
membership; use a source dimension when the server must reject unknown members.
In local apps, list the options operation in the shared `operationFilters` map
like any other operation that reads filters.

## Display choices and breakdowns

Use `displayChoice()` for a choice that changes how results are shown rather
than which data is included. List it on the operation, which receives the
selected ID and groups its results accordingly:

```ts
const countsBy = displayChoice({
  key: 'counts-by',
  label: 'Counts breakdown',
  defaultValue: 'group',
  options: [
    { id: 'group', label: 'Group' },
    { id: 'country', label: 'Country' },
  ],
  presentation: { control: 'widget' },
});
// ... sampleCountsByGroup declares filters: { groupName, countsBy }
```

Pass `view.breakdown('countsBy')` to `<VisualizationWidget breakdown={...}>`;
the view's operation must declare the choice. Without `control: 'widget'`, a
display choice renders in the toolbar's display options. Declare a separate
choice for each independently controlled chart. Display choices do not appear in
the scope. Use `presentation.prominence: 'secondary'` for less frequent filters.

## Reporting periods

An operation reads at most one date filter. It sets the view's reporting period,
time zone, and metric comparisons; it need not be named `period`. For calendar
days, use `dateRangeFilter()` with a shared `defineDateRangeContract()`:

```ts
const calendar = defineDateRangeContract({ maxRangeDays: 90, timeZone: 'UTC' });
const period = dateRangeFilter({
  key: 'period',
  contract: calendar,
  comparison: true,
  defaultValue: { kind: 'preset', id: 'last-7' },
});
const dailyCounts = dataApp.defineOperation({
  filters: { period, groupName },
  policy: { maxQueryRows: 100, maxDurationMs: 15000 },
  async run({ query }, { period, groupName }) {
    const result = await query('dailyCounts', {
      period: period.range,
      groupName,
    });
    // ... query { period: period.comparison } when it is not null
    return result.rows;
  },
});
```

`period.range` holds inclusive ISO dates. Pass it to a
[`dateRange` parameter](contract.md#bind-date-ranges) and filter with
`$period.from` and `$period.to`. `comparison: true` adds the previous-period
toggle; `period.comparison` is `null` while it is off. Add
`comparison: 'previous'` to `defaultValue` to start with it on.

### Absolute and relative datetime ranges

Use `dateTimeRangeFilter()` for times, rolling windows, or mixed absolute and
relative bounds:

```ts
import {
  dateTimeRangeFilter,
  dateTimeRangePresets,
  defineDateRangeContract,
} from '@altertable/data-app/contract';

const calendar = defineDateRangeContract({
  maxRangeDays: 366,
  timeZone: 'UTC',
  completeDays: false,
});
const period = dateTimeRangeFilter({
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
  filters: { period },
  policy: { maxQueryRows: 1000, maxDurationMs: 15000 },
  async run({ query }, { period }) {
    const current = await query('events', { period: period.range });
    const previous = period.comparison
      ? await query('events', { period: period.comparison })
      : null;
    return { current: current.rows, previous: previous?.rows ?? null };
  },
});
```

Use `dateTimeRangePresets.monitoring` (past 5 and 15 minutes, past hour, 4 hours, and 24 hours) for shorter windows; `dateTimeRangePresets.analytics` covers past 7, 30, and 90 days, month and year to date, and the past year. A preset `range` is typed-range text such as `'24h'`, `'3d'`, or `'6mo'`. Bind the query bounds
to a [`dateTimeRange` parameter](contract.md#bind-date-ranges).
`allowComparison: true` adds the toggle, requires `contract`, and supplies current
and previous ranges resolved against one reference time. Omit it for a plain
`DateTimeRange` input; `contract` is then optional. Relative selections stay
relative across reloads.

## Exclusion, clear, and reset

Clear removes filter predicates and returns dates to defaults, preserving search
and display choices. `resetAll()` restores all defaults. Filters apply immediately;
use app-owned drafts only when the task needs Apply/Cancel.

Custom control ownership is needed only when generated controls cannot express
the requirement; use `/ui` for that case. Do not reuse reserved inspection,
presentation, or navigation URL keys.

## Share filters with HTTP and local apps

HTTP and local apps keep operations on the server, so the browser imports them
as types only. Declare filters in a browser-safe module that both sides import:

```ts
// src/filters.ts
import { choiceFilter } from '@altertable/data-app/contract';

const groupName = choiceFilter({
  // ... key, label, defaultValue, and options
});

export const operationFilters = {
  sampleCountsByGroup: { groupName },
  sampleCountsBySegment: { groupName },
};
```

Each operation in `src/operations.ts` declares
`filters: operationFilters.sampleCountsByGroup`, and the browser client receives
the same map:

```ts
// src/App.tsx
import { operationFilters } from '#app/filters.ts';
import type { operations } from '#app/operations.ts';

const { defineView } = createDataHooks(
  createDataClient<typeof operations>({ filters: operationFilters })
);
```

The client's types require `filters` whenever an operation declares them.

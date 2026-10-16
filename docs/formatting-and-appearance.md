# Formatting and appearance

Use package helpers so a value has the same meaning in prose, tables, charts,
and stories. TypeScript and JSDoc describe options and supported values.

## Format values

Import formatting helpers from `@altertable/data-app/format`.

| Helper              | Use                                                    |
| ------------------- | ------------------------------------------------------ |
| `formatNumber()`    | General numerical values                               |
| `formatCount()`     | Nonnegative integer counts, optionally compact         |
| `formatPercent()`   | Ratios represented as a fraction, such as 0.12 for 12% |
| `formatMetric()`    | A metric definition's count, ratio, or currency format |
| `formatDate()`      | Calendar dates without time-zone shifts                |
| `formatDateTime()`  | Event timestamps in the reporting time zone            |
| `formatTime()`      | Intraday chart labels                                  |
| `formatDateRange()` | Inclusive calendar ranges                              |
| `pluralize()`       | Count-dependent labels                                 |

Missing values render distinctly from measured zero. Declare formatting once on
`view.metric()` so widgets, comparisons, and narrative share it; reuse the
definition with `formatMetric()` in story headlines.

Use compact counts for headline metrics and chart labels. Declare count metrics
with `format: { kind: 'count', compact: true }`. Keep full counts in tables used
for precise comparisons and raw numeric values in datasets for CSV export.

```ts
formatCount(2_200_000, { compact: true }); // "2.2M"
formatCount(2_200_000); // "2,200,000"
```

For signed or fractional measures, use `formatNumber()` with
`notation: 'compact'` and preserve the measure's units.

Import `chartColor()` from `@altertable/data-app-react` to select colors from the configured palette.
`<PeriodSummary>` describes reporting periods; `<UpdatedAt>` and
`<DateTimeTooltip>` expose readable timestamps with exact-date details.
`<DataTableTimestamp>` and `<DataTableShare>` format custom table cells.

## Display dates consistently

Declare date meaning on dataset columns so tables use readable values and CSV
keeps the originals:

```ts
columns: {
  day: { value: row => row.day, format: { kind: 'date' } },
  observed: {
    value: row => row.observed,
    format: { kind: 'dateTime', precision: 'second' },
  },
}
```

Calendar dates use `YYYY-MM-DD`. Instants accept epoch milliseconds or timestamp
strings; `<DateDisplay>` also accepts `Date`. Timestamp strings require `Z` or an explicit
offset; convert database-local timestamps in the operation using their known
source zone. Ambiguous or invalid values display as missing.

Use `<DateDisplay>` for prose and `useDateFormatting()` with format helpers for
custom chart labels. Defaults are `en-US` and UTC; configure app-wide
`dateFormatting: { locale, timeZone }` when appropriate. A time view supplies its
reporting zone, and an explicit field zone overrides it. Keep seconds when event
ordering matters; exact-time details remain available on timestamps.

## Configure identity and appearance

```ts
import { defineDataApp } from '@altertable/data-app';

const dataApp = defineDataApp({
  title: 'Product activity',
  description: 'Explore product usage and trends.',
  scope: { organization: 'Acme', environment: 'Production' },
  appearance: {
    theme: 'system',
    baseColor: 'neutral',
    density: 'comfortable',
  },
  queries: {},
});
```

Scope labels describe the configured connection; they do not grant access.

Title and description explain the app and can be revised when regenerating it.
Omit appearance to use the standard defaults.

The default UI is neutral in light and dark themes. Use `baseColor` for the base
palette and `accentColor` with optional `darkAccentColor` for brand emphasis.
Configure chart colors separately with `chartColors`; preserve semantic status
colors for favorable and unfavorable outcomes.

Configure appearance once for the app. Theme preference is user-owned in standalone apps. A trusted parent's
resolved theme takes precedence and hides local theme controls; see
[parent presentation](embed.md#parent-presentation).

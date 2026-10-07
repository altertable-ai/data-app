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
| `formatDateRange()` | Inclusive calendar ranges                              |
| `pluralize()`       | Count-dependent labels                                 |

Missing values render distinctly from measured zero. Define metric formatting
once with `view.metric()`; comparisons derive from its displayed source. Previous
values, range labels, and favorable direction belong to that metric and displayed
input; see [data context](data-context.md) and [views](views.md).

Use compact counts for headline metrics and chart labels so large values remain
readable. Declare `format: { kind: 'count', compact: true }` on `view.metric()`
so bound widgets, comparisons, and narrative share the same formatting. Reuse
the metric's format with `formatMetric()` in story headlines.

```ts
formatCount(2_200_000, { compact: true }); // "2.2M"
formatCount(2_200_000); // "2,200,000"
```

For custom count chart labels, pass a callback such as
`formatValue={value => formatCount(value, { compact: true })}`. Keep full counts
in tables used for precise comparisons with `format: { kind: 'count' }`, and
keep dataset values numeric so CSV exports retain the raw values.

Counts are nonnegative integers. For signed or fractional measures, use
`formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 })` and
preserve the measure's units; include `style: 'currency'` and `currency` for money.
Use `formatPercent()` for ratios.

Import `chartColor()` from `/react` to select colors from the configured palette.
`<PeriodSummary>` describes reporting periods; `<UpdatedAt>` and
`<DateTimeTooltip>` expose readable timestamps with exact-date details.
`<DataTableTimestamp>` and `<DataTableShare>` format custom table cells.

## Configure identity and appearance

```ts
import type { DataAppConfig } from '@altertable/data-app/config';

const config = {
  title: 'Product activity',
  scope: { organization: 'Acme', environment: 'Production' },
  appearance: {
    theme: 'system',
    accentColor: '#405d47',
    density: 'comfortable',
  },
} satisfies DataAppConfig;
```

Scope labels describe the configured connection; they do not grant access.
`dataAppTitle()` produces the scoped document title used by `mountDataApp()`.

Appearance controls the brand palette, typography, density, corner radius, and
elevation. Those settings apply consistently to the app instead of tuning each
widget. Theme preference is reader-owned in standalone apps. A trusted parent's
resolved theme takes precedence and hides local theme controls; see
[parent presentation](embed.md#parent-presentation).

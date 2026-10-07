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
once with `context.metric()` and use metric readings for comparisons. Previous
values, range labels, and favorable direction belong to that metric and displayed
input; see [data context](data-context.md) and [views](views.md).

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

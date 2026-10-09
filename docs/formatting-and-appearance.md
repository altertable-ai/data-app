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

Import `chartColor()` from `/react` to select colors from the configured palette.
`<PeriodSummary>` describes reporting periods; `<UpdatedAt>` and
`<DateTimeTooltip>` expose readable timestamps with exact-date details.
`<DataTableTimestamp>` and `<DataTableShare>` format custom table cells.

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
    accentColor: '#405d47',
    density: 'comfortable',
  },
  queries: {},
});
```

Scope labels describe the configured connection; they do not grant access.
`dataAppTitle()` produces the scoped document title used by `mountDataApp()`.

Title and description explain the app and can be revised when regenerating it.
Omit appearance to use the standard defaults.

`baseColor` chooses the palette for surfaces, text, and borders: neutral, slate,
or warm. It is independent of `accentColor`, which defaults to green and supplies
emphasis for checked controls and selected dates. Primary buttons use the text
color; dropdown selections use the base palette. Chart colors are configured
separately through `chartColors`.

For a monochrome app, declare `baseColor: 'neutral'`, `accentColor: '#202124'`,
and `darkAccentColor: '#f2f3f4'`. Setting the base palette alone does not remove
the accent. Both palettes adapt to the resolved light or dark theme.

Appearance controls the brand palette, typography, density, corner radius, and
elevation. Those settings apply consistently to the app instead of tuning each
widget. Theme preference is reader-owned in standalone apps. A trusted parent's
resolved theme takes precedence and hides local theme controls; see
[parent presentation](embed.md#parent-presentation).

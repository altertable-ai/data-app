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
or warm. The default UI is neutral in both light and dark themes; no color
settings are required. `accentColor` and optional `darkAccentColor` add brand
emphasis to checked controls, selected dates, links, and navigation. Primary
buttons and dropdown rows use the base palette.

Status colors are independent of branding: `--atbl-positive` identifies favorable
outcomes and connected/live states; `--atbl-negative` defaults to the danger
color. Chart colors are configured separately through `chartColors`: standalone
series derive their colors from the first slot, while categorical series use the palette.

Appearance controls the brand palette, typography, density, corner radius, and
elevation. Those settings apply consistently to the app instead of tuning each
widget. Density scales regular and compact controls; icon artwork remains a fixed
size for legibility. Annotation-tool geometry stays fixed while inheriting fonts
and colors. Elevation covers surfaces, overlays, and selected utility controls.
Theme preference is reader-owned in standalone apps. A trusted parent's
resolved theme takes precedence and hides local theme controls; see
[parent presentation](embed.md#parent-presentation).

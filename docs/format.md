# Formatting

Import number and date helpers from `@altertable/data-app/format`. They use
JavaScript `Intl` APIs and can run in the browser or on the server.

```ts
import {
  formatCount,
  formatDateRange,
  formatNumber,
  formatPercent,
} from '@altertable/data-app/format';

formatCount(1200); // "1,200"
formatPercent(0.116); // "11.6%"
formatNumber(null); // "—"
formatDateRange({ start: '2026-01-01', end: '2026-01-03' });
```

Percent values are ratios: `0.116` means 11.6%. Counts must be non-negative
integers. Missing or non-finite numbers render as `—`, customizable with
`missing`. Number formatting defaults to `en-US`; pass `locale` to override it.

`formatMetric` accepts a `MetricFormat` with `kind: 'count'`, `'ratio'`, or
`'currency'`; currency formats also require a currency code. `formatDateRange`
formats ISO calendar dates in UTC and retains the year in its labels.
`pluralize(count, singular, plural?)` selects a label for the count.

See [React metric definitions](react.md#bound-views-and-widgets).

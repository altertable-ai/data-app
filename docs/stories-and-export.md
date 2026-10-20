# Stories and CSV export

Supply `story` and `datasets` on `<DataApp>` from `@altertable/data-app-react`.
Both use the displayed snapshot, including during refresh or failure. Before a
result is available, the toolbar actions stay visible and disabled.
Setup and static screens use `<DataApp>` from `/ui` and may omit both.

## Present data with stories

Return one to four findings with a headline, visual, and registered dataset or
metric as `evidence`. Reuse bindings and derive scope from the snapshot:

```tsx
story={snapshot => {
  const totalReading = total.read(snapshot);
  return [{
    id: 'total',
    headline: `Tracked identities: ${formatMetric(totalReading.value.current, total.definition.format)}`,
    context: activityView.scope(snapshot),
    visual: <MetricWidget metric={total} source={snapshot} />,
    evidence: total,
  }];
}}
```

Use the [format helpers](formatting-and-appearance.md) in prose. Custom shells
can use `<PresentStory>` from `/ui`; see [direct composition](ui.md).

## Export displayed data as CSV

Declare [datasets](widgets.md#declare-datasets-and-metrics) once and pass
`datasets={[countries, otherDataset]}`. Include every distinct displayed dataset
at its displayed grain; reuse a dataset for visuals sharing the same rows.

One dataset downloads as CSV; multiple datasets offer individual downloads and
**Export all** as ZIP. Filenames use the displayed scope. Accessors must return
raw values: null and undefined export as empty cells, and measured zero stays
zero. Export handles quoting and spreadsheet formula protection.

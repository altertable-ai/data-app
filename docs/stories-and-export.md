# Stories and CSV export

Supply `story` and `datasets` on `<DataApp>` from `@altertable/data-app-react`.
Both use the displayed snapshot, including during refresh or failure. Before a
result is available, the toolbar actions stay visible and disabled.
Setup and static screens use `<DataApp>` from `/ui` and may omit both.

## Present data with stories

Continue the starter's `totalSamples` binding. Return one to four findings with a
headline, visual, and registered dataset or
metric as `evidence`. Reuse bindings and derive scope from the snapshot:

```tsx
// ... sampleCountsView, sampleCounts, totalSamples, and sampleContent
function App() {
  return (
    <DataApp
      view={sampleCountsView}
      datasets={[sampleCounts]}
      story={snapshot => {
        const total = totalSamples.read(snapshot);
        return [
          {
            id: 'total-samples',
            headline: `Total samples: ${formatMetric(total.value.current, totalSamples.definition.format)}`,
            context: sampleCountsView.scope(snapshot),
            visual: <MetricWidget metric={totalSamples} source={snapshot} />,
            evidence: totalSamples,
          },
        ];
      }}
    >
      <DataSection content={sampleContent} />
    </DataApp>
  );
}
```

Keep the starter's `formatMetric()` import for formatted headlines.

## Export displayed data as CSV

Declare [datasets](widgets.md#declare-datasets-and-metrics) once and pass
`datasets={[sampleCounts]}`. Include every distinct displayed dataset
at its displayed grain; reuse a dataset for visuals sharing the same rows.

One dataset downloads as CSV; multiple datasets offer individual downloads and
**Export all** as ZIP. Filenames use the displayed scope. Accessors must return
raw values: null and undefined export as empty cells, and measured zero stays
zero. Export handles quoting and spreadsheet formula protection.

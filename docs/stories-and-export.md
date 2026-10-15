# Stories and CSV export

Every `<DataApp>` from `/react` supplies both `story` and `datasets`, derived from
the displayed snapshot. For a single view, story and export selectors do not run before a result is available.
Setup and static screens use `<DataApp>` from `/react/ui`; they may omit both
or pass a direct `CsvExport` object.

## Present data with stories

Set `story` on `<DataApp>` to enable **Present story** in the toolbar.
For custom shells, `/react/ui` provides `<PresentStory>`; see [direct UI composition](ui.md). Start from the [data app starter](../examples/starter-data-app/index.tsx).

Return one to four findings with a headline, a visual, and registered source
evidence. Set `evidence` to the registered dataset or metric binding. The app
validates that every finding belongs to its view.

The callback receives the displayed source and its original input, including
during refresh or failure. Derive the story from that snapshot so it agrees with
the visible exploration. Initial loading, empty results, and initial errors have
no story to present; the toolbar keeps its story action visible and disabled.

## Export displayed data as CSV

Select all distinct named datasets from the displayed snapshot. One dataset downloads directly as CSV. Multiple
datasets offer individual CSV downloads and **Export all** as a ZIP archive.
While no displayed snapshot is available, the export action stays visible and disabled.

Declare [datasets](widgets.md#declare-datasets-and-metrics) once and pass
`datasets={[countries, otherDataset]}` to `<DataApp>`. The toolbar
exports those datasets with raw values and a safe filename derived from the
displayed scope. List every distinct dataset the app shows.

Reuse bound metrics in story visuals:

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

Use the [format helpers](formatting-and-appearance.md) for story prose.

Dataset accessors return raw values; do not preformat numbers as display
labels. Null and undefined become empty cells, while measured zero stays zero.
The helpers handle quoting and spreadsheet formula protection.

## Independent views

With `<DataApp views={{ sales: salesView, acquisition: acquisitionView }}>`, story
callbacks receive those keys with typed displayed snapshots. A view without a
displayed result is `undefined`; check it before deriving findings. Export datasets
must belong to a registered view and have distinct names. Story evidence must
belong to a registered view with a displayed result.

Derive claims from each snapshot's data and original input. Cross-view findings
must check that all required snapshots exist and have compatible scopes; keep
claims that must update together on one view. The platform adds each finding's
evidence view scope and marks a retained failed refresh as the last successful
result.

The export menu labels each dataset with its displayed scope and retained-error
status. Unavailable datasets stay visible and disabled. Export all is disabled
until every declared dataset has a displayed result. Individual available datasets
remain exportable.

Opening a story or export menu freezes its displayed results. Reopen it to use
new results. An export retry repeats the failed download's original data.

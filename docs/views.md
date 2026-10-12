# Views and displayed results

## Bind a view

```tsx
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  DataApp,
  DataSection,
} from '@altertable/data-app/react';
import type { operations } from '#app/operations.ts';

const client = createDataClient<typeof operations>();
const { defineDataView } = createDataHooks(client);
const activityView = defineDataView({
  dataContext,
  operation: 'activity',
  describeInput: () => 'all activity',
  isEmpty: data => data.rows.length === 0,
  emptyFallback: { title: 'No activity' },
});
const content = activityView.content(result => (
  <ActivityWidgets source={result} />
));

function App() {
  return (
    <DataApp view={activityView} story={story} datasets={[activityDataset]}>
      <DataSection content={content} />
    </DataApp>
  );
}
```

Omit `variables` when there are no controls. Omit `input` when the resolved
variables match the operation input; nested or different inputs need a mapper.
The operation and `ActivityWidgets` are app-owned. The bound widgets derive
loading content from their source; see [widgets](widgets.md) and the
[complete starter](../examples/starter-data-app/index.tsx). Define
[filters](variables.md), [context and evidence](data-context.md), and
[story and datasets](stories-and-export.md) for the app's question.

Render static text immediately; skeletonize only dynamic content. Keep section
introductions outside request boundaries so they remain visible on empty and
error states.

Use `<DataSection>` for each independently fetched subtree and `view.content()`
to share its loading and ready layout. Refreshes retain displayed content.

Use `<DataValue>` for a dynamic value within static prose:

```tsx
<p>
  Orders in the last 7 days: <DataValue metric={weeklyOrders} source={result} />
</p>
```

Bind the whole sentence with `<TextWidget>` when its wording depends on the result.
Use `<DataValue scope={result.scope} />` for the displayed scope label.

Use the same [date range contract](contract.md#shared-date-ranges) for the
operation and its view. For nested inputs in `defineTimeView()`, use
`bindings.period` to extract the selected period; see the
[time-view example](variables.md#declare-controls-once).

Use `result.scope` inside `view.content()` to show scope text. In stories and exports,
`view.scope(snapshot)` returns the same label from the displayed input, using
`describeInput` or the view's date label.

Declare standard controls in the view's [variables](variables.md). Keep
local-only filters out of the operation's `input`.

For large tables, use query-backed pagination with a stable sort and total
count. Client pagination and search cover only the rows already returned.

Declare evidence references on `view.dataset()` for charts and tables. `<MetricWidget>` uses
its metric definition for the label, format, and evidence; keep view-specific
descriptions on the widget.

`<MetricWidget>` and `<Comparison>` share a metric result. Comparisons
follow the displayed result's range.

Use the [format helpers](formatting-and-appearance.md) for metric formats and values in tables,
charts, and custom views.

## Preserve displayed results

Bind widgets to the source supplied by `view.content()`. Derive scope labels,
stories, and exports from its displayed input, including during refreshes.
Keep related datasets in one view so their results stay consistent; use
`<DataSection>` for independently queried content. Let the view handle loading,
errors, and refreshes instead of duplicating request state in app code.

A measured zero is valid data. Define `isEmpty` for the analysis and provide
useful `emptyFallback` copy.

# Views and displayed results

Keep the starter's client and hooks. Define one view per operation, and one
operation per widget. The examples continue the hosted starter's
`sampleCountsByGroup` operation and `sampleDataContext`.

## Bind a view

```tsx
import {
  createDataHooks,
  DataApp,
  DataSection,
  searchVariable,
  TableWidget,
} from '@altertable/data-app-react';

// ... client, operations, and sampleDataContext
const { defineDataView } = createDataHooks(client);

const sampleCountsView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  variables: {
    groupName: searchVariable({
      key: 'group',
      label: 'Group',
      defaultValue: '',
    }),
  },
  describeInput: ({ groupName }) =>
    groupName ? `group ${groupName}` : 'all groups',
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No matching groups' },
});
// ... sampleCounts dataset and story callback
const sampleContent = sampleCountsView.content(result => (
  <TableWidget dataset={sampleCounts} source={result} />
));

function App() {
  return (
    <DataApp view={sampleCountsView} story={story} datasets={[sampleCounts]}>
      <DataSection content={sampleContent} />
    </DataApp>
  );
}
```

Keep operation input flat and named like the variables. Omit `input` and
`bindings` when those shapes match. Use `defineTimeView()` for period-driven
analysis and `defineDataView()` otherwise. Adapt an existing nested input only
when required; see [input mapping](variables.md#adapt-existing-input-shapes).

## Give each widget its own view

The hosted starter gives its total and its group counts separate operations and
views. `<DataApp view>` loads with the page; every other `<DataSection>` loads
when it nears the viewport. Declare shared filters once and pass them to each
view. The `<DataApp>` view must include every shared filter because it renders
their controls; a section whose filters it lacks fails with an error:

```tsx
// ... client, operations, sampleDataContext, and section contents
const { defineDataView } = createDataHooks(client);

const groupFilters = {
  groupName: searchVariable({ key: 'group', label: 'Group', defaultValue: '' }),
};
function describeGroup({ groupName }: { groupName: string }) {
  return groupName || 'all groups';
}
const sampleCountsView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleCountsByGroup',
  variables: groupFilters,
  describeInput: describeGroup,
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No matching groups' },
});
const sampleTotalView = defineDataView({
  dataContext: sampleDataContext,
  operation: 'sampleTotal',
  variables: groupFilters,
  describeInput: describeGroup,
});

function App() {
  return (
    <DataApp view={sampleCountsView}>
      <Stack>
        <DataSection content={totalContent} />
        <DataSection content={countsContent} />
      </Stack>
    </DataApp>
  );
}
```

Share one [data context](data-context.md) across the app's views. Group widgets
in one view only when they show the same result, such as a chart and the table
of its rows. A story or export that reads other views lists them in
[`summaryViews`](stories-and-export.md).

## Preserve displayed results

Use the source from `view.content()` for every widget. Derive narrative, story,
export, and scope from that source and its displayed input, including during
refresh or failure. Use `result.scope` in content and `view.scope(snapshot)` in
stories. Let views and bound widgets own request state and loading feedback.
Keep static introductions outside loading boundaries.

A measured zero is valid data. Set `isEmpty` and useful `emptyFallback` copy when
a result can be empty; omit both when it never is, such as a total.

## Detail destinations

Add `defineDetailView()` only when readers need a scoped population or entity.
The destination owns its input parser, operation, datasets, context, and content.
Pass its content to `<DataApp details={[groupDetail]}>`:

```tsx
// ... client, operations, sampleDataContext, main view, datasets, and story
const { defineDetailView } = createDataHooks(client);

const groupView = defineDetailView({
  id: 'group',
  title: 'Group counts',
  operation: 'sampleCountsByGroup',
  dataContext: sampleDataContext,
  parseInput: operations.sampleCountsByGroup.input,
  describeInput: ({ groupName }) => `group ${groupName}`,
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No matching group' },
});
const groupCounts = groupView.dataset({
  name: 'Group counts',
  select: rows => rows,
  rowKey: row => row.groupName,
  columns: {
    groupName: { value: row => row.groupName },
    sampleCount: { value: row => row.sampleCount, format: { kind: 'count' } },
  },
  evidence: { id: 'group-counts', glossaryIds: ['sampleCount'] },
});
const groupDetail = groupView.content(result => (
  <TableWidget dataset={groupCounts} source={result} />
));

function App() {
  return (
    <DataApp
      view={sampleCountsView}
      datasets={[sampleCounts]}
      story={story}
      details={[groupDetail]}
    >
      <DataSection content={sampleContent} />
    </DataApp>
  );
}
```

Pass serializable scope and IDs, not records or credentials. Validate dimension selections with
the dashboard's `variableInput()` parser. The main app owns stories and exports.

### Contributing metric records

Use `metric.records()` when a detail shows the records behind that metric, then
pass it to `<MetricWidget records={...}>`. Match record inclusion to the metric
and explain non-additive measures or completeness limits. Query matching records
rather than filtering a capped dashboard preview; use server pagination for
larger populations.

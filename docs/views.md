# Views and displayed results

Keep the starter's client and hooks. Use one view for related results; split only
when sections need independent requests. The examples continue the hosted
starter's `sampleCountsByGroup` operation and `sampleDataContext`.

## Bind a view

```tsx
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
const sampleContent = sampleCountsView.content(result => (
  <TableWidget dataset={sampleCounts} source={result} />
));

<DataApp view={sampleCountsView} story={story} datasets={[sampleCounts]}>
  <DataSection content={sampleContent} />
</DataApp>;
```

`sampleCounts` is the starter's dataset; `story` is its displayed-snapshot callback.
Keep operation input flat and named like the variables. Omit `input` and
`bindings` when those shapes match. Use `defineTimeView()` for period-driven
analysis and `defineDataView()` otherwise. Adapt an existing nested input only
when required; see [input mapping](variables.md#adapt-existing-input-shapes).

## Preserve displayed results

Use the source from `view.content()` for every widget. Derive narrative, story,
export, and scope from that source and its displayed input, including during
refresh or failure. Use `result.scope` in content and `view.scope(snapshot)` in
stories. Let the view own request state; keep static introductions outside
loading boundaries.

A measured zero is valid data. Set `isEmpty` for the analysis and provide useful
`emptyFallback` copy.

## Detail destinations

Add `defineDetailView()` only when readers need a scoped population or entity.
The destination owns its input parser, operation, datasets, context, and content.
Pass its content to `<DataApp details={[groupDetail]}>`:

```tsx
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
```

Obtain `defineDetailView` from the starter's hooks factory. Pass serializable
scope and IDs, not records or credentials. Validate dimension selections with
the dashboard's `variableInput()` parser. The main app owns stories and exports.

### Contributing metric records

Use `metric.records()` when a detail shows the records behind that metric, then
pass it to `<MetricWidget records={...}>`. Match record inclusion to the metric
and explain non-additive measures or completeness limits. Query matching records
rather than filtering a capped dashboard preview; use server pagination for
larger populations.

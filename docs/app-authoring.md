# Author a data app

Use the SDK to connect queries, operations, views, and widgets. The app brief determines the content structure. Component examples do not prescribe
which sections or features every app must contain.

## Use release-matched starters

For an existing app, keep its runtime and structure; apply only the steps needed
for the requested change. For a new app, use the starter supplied by the authoring workflow, matched to the app's SDK version.
`@altertable/data-app-examples` ships these templates:

| Runtime                 | Template in `node_modules/@altertable/data-app-examples/templates/` |
| ----------------------- | ------------------------------------------------------------------- |
| Hosted / remote / cloud | `starter-data-app/index.tsx`                                        |
| Local                   | `starter-local-data-app`                                            |
| Hosted metric           | `starter-metric-data-app/index.tsx`                                 |
| Local metric            | `starter-local-metric-data-app`                                     |
| Hosted Finding          | `starter-finding-data-app/index.tsx`                                |
| Local Finding           | `starter-local-finding-data-app`                                    |

Choose the runtime and use case supplied by the app brief. The general starter
is one complete result: one query, operation, view, dataset, and chart. The
metric and Finding starters add a second result, drill-down, and comparison.
Hosted apps stay in one file with public package imports and a literal
`defineDataApp()` declaration. Local apps split the same code across app-owned
files. Edit app-owned files, not installed packages.

## Write the app in order

Each step uses what the previous one declared. The snippets are the general
starter; repeat steps 2–7 for each independent result. Widgets share a result
when they show the same rows or metrics from one summary, such as a total, a
count, and their average.

1. **Inspect the data.** Establish the population, grain, measures, and
   comparison from real fields, definitions, time coverage, and missing
   observations. Preserve supplied metric definitions.
2. **Declare the query.** Write DuckDB SQL with named parameters, and declare
   every parameter and result alias. See [queries](contract.md).

   ```ts
   export const dataApp = defineDataApp({
     // ... title, description, and scope
     queries: {
       sampleCountsByGroup: {
         statement: `
   SELECT group_name, CAST(SUM(sample_count) AS BIGINT) AS sample_count
   FROM sample_counts
   WHERE $groupName = 'all' OR group_name = $groupName
   GROUP BY group_name ORDER BY sample_count DESC, group_name LIMIT $limit`,
         params: {
           groupName: { type: 'string', defaultValue: 'all' },
           limit: { type: 'number', defaultValue: 10 },
         },
         projections: {
           group_name: { type: 'string' },
           sample_count: { type: 'number' },
         },
       },
     },
   });
   ```

3. **Declare filters, then the operation that reads them.** Declare each filter
   once as a constant. `run()` receives one field per filter and returns the
   rows the app displays. See [filters](filters.md).

   ```ts
   const groupName = choiceFilter({
     key: 'group',
     label: 'Group',
     defaultValue: 'all',
     options: [
       { id: 'all', label: 'All groups' },
       { id: 'Alpha', label: 'Alpha' },
     ],
   });

   export const operations = dataApp.defineOperations({
     sampleCountsByGroup: dataApp.defineOperation({
       filters: { groupName },
       policy: { maxQueryRows: 10 },
       async run({ query }, { groupName }) {
         const { rows } = await query('sampleCountsByGroup', { groupName });
         return rows.map(row => ({
           groupName: row.group_name,
           sampleCount: row.sample_count,
         }));
       },
     }),
   });
   ```

4. **Describe the data.** Define the terms readers need and cite the queries
   behind each one. See [data context](data-context.md).

   ```ts
   const dataContext = createDataContext(dataApp.queryNames)({
     description: 'Sample counts by group.',
     glossary: {
       sampleCount: {
         term: 'Sample count',
         definition: 'Sum of recorded samples in the selected group scope.',
         queryNames: [dataApp.queryNames.sampleCountsByGroup],
       },
     },
   });
   ```

5. **Define one view per operation.** Its filters, reporting period, and scope
   derive from the operation. See [views](views.md).

   ```ts
   const { defineView } = createDataHooks(operations.createDataClient());
   const sampleCountsView = defineView({
     dataContext,
     operation: 'sampleCountsByGroup',
     emptyFallback: { title: 'No matching groups' },
   });
   ```

6. **Bind a dataset or metric to the view.** A column named after a row field
   reads it; a stable `rowKey` identifies each row. See
   [widgets](widgets.md#declare-datasets-and-metrics).

   ```ts
   const sampleCounts = sampleCountsView.dataset({
     name: 'Sample counts',
     rowKey: row => row.groupName,
     columns: {
       groupName: { label: 'Group' },
       sampleCount: { format: { kind: 'count' } },
     },
     evidence: { id: 'counts-by-group', glossaryIds: ['sampleCount'] },
   });
   ```

7. **Render the result.** Pass the headline view to `<DataApp view>`, which
   renders every filter's control, and give each view's content its own
   `<DataSection>`. Follow the app brief for section order and narrative.

   ```tsx
   const countsContent = sampleCountsView.content(result => (
     <VisualizationWidget dataset={sampleCounts} source={result}>
       {rows => (
         <BarChart
           ariaLabel="Sample counts by group"
           unit="samples"
           items={rows.map(row => ({
             id: row.groupName,
             label: row.groupName,
             value: row.sampleCount,
           }))}
         />
       )}
     </VisualizationWidget>
   ));

   function App() {
     return (
       <DataApp view={sampleCountsView} datasets={[sampleCounts]}>
         <DataSection content={countsContent} />
       </DataApp>
     );
   }
   ```

Use bound widgets from `@altertable/data-app-react` for data-backed content.
Use [`/ui` components](ui.md) or custom UI only when a bound widget cannot
express the requirement. Keep credentials, authorization, protected values such
as `orgId`, and enforced query limits in the host/backend. The starter supplies
transport and mounting; change them only for an explicit integration task.

## Verify the app

Run the authoring workflow's validation, then inspect the app:

- Check findings against the source population, units, ordering, and coverage.
  Distinguish measured zero, missing values, and empty results.
- Change filters and exercise loading, empty, error, refresh, and stale states.
  Narrative, scope, story, and export must agree with the displayed result.
- For exposed presentation and export features, check the story, exported
  columns, raw values, filename, and scope.
- Review app-owned content for clipping and readability at its intended width.
  Check custom layout or CSS at narrow and wide widths; check custom colors in
  both themes.

When an app fails, use the host's repair or copy action to send observed diagnostics
together. Repair requests preserve the existing authorization boundary and cover
only exercised checks and interactions. See [diagnostics and repair](diagnostics.md)
for host integration.

## Fix common failures

| Symptom                                                          | Fix                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| The hosted app declaration is rejected                           | Keep the `defineDataApp()` argument literal; see [hosted apps](hosted-apps.md)              |
| `Unknown query name` or a parameter type error in `query()`      | Use a name and the exact parameters declared in `queries`                                   |
| A result column is missing or has the wrong type                 | Declare every returned SQL alias in `projections` with its exact casing                     |
| A column asks for `value`, or reports that its rows lack a field | Name the column after a field of the returned rows, or set `value` for a computed column    |
| A dataset asks for `select`                                      | The operation returns an object; select its row array                                       |
| A filter reports a duplicate name or URL key                     | Reuse one filter constant across operations instead of declaring it twice                   |
| A filter reports a reserved URL key                              | Choose a `key` other than `view`, `about`, `tab`, `present`, `step`, and `details`          |
| An operation reports its row or duration limit                   | Set `policy.maxQueryRows` between 1 and 10,000; paginate larger results in the query        |
| A binding requires the source from its own view                  | Pass the `result` of the same view's `content()` to its datasets and metrics                |
| Evidence reports an unknown query or glossary ID                 | Cite names from `dataApp.queryNames` and glossary keys from the view's data context         |
| A metric comparison is rejected                                  | Return `previous` only when the operation reads a `dateTimeRangeFilter()` with `comparison` |

## Look up only what is missing

Search [REFERENCE.md](../REFERENCE.md) for the exact export or method first:

```sh
rg '(^|\.)defineView\b' REFERENCE.md
```

`DataApp` and the widgets exist twice: `@altertable/data-app-react` exports the
bound component and `/ui` a primitive with different props. Each field in the
reference names its import path, so read the fields of the one you import:

```sh
rg '^TableWidget\..*\(@altertable/data-app-react\)' REFERENCE.md
```

Open only the section needed for a requirement the starter does not cover:

| When                                         | Read                                                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Adding categorical, numeric, or time filters | [Filters](filters.md)                                             |
| Adding a chart or narrative binding          | [Widgets](widgets.md)                                             |
| Adding a second result or a summary          | [Views](views.md#give-each-independent-result-its-own-view)       |
| Adding a detail destination                  | [Detail views](views.md#detail-destinations)                      |
| Adding a presentation story or CSV export    | [Stories and export](stories-and-export.md)                       |
| Arranging sections or adapting to width      | [Layout](layout.md)                                               |
| Linking to external pages                    | [External links](ui.md#external-links)                            |
| Adding supplemental control hints            | [Tooltips](ui.md#tooltips-and-explanations)                       |
| Registering physical sources                 | [Source identifiers](data-context.md#register-source-identifiers) |
| Customizing appearance or CSS                | [Formatting](formatting-and-appearance.md), [styling](styling.md) |

Keep the starter's working pattern when it meets the requirement. Host integration
guides apply only when building or changing a host.

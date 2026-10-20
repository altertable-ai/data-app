# Author a data app

Build an exploration that answers the user's question and a story of its strongest
findings.

Search the [API reference](../REFERENCE.md) for exports, props, and signatures.

## Inspect the data

Inspect relevant tables, fields, time coverage, and definitions. Establish the
population, grain, units, ordering, and missing or incomplete observations.
When supplied a query registry, use its queries and preserve its SQL. Otherwise,
declare the queries the app needs with `defineDataApp()`. Declare typed `params`
and `projections`, then derive operations from `query()` rows; see
[contracts](contract.md).

## Plan the exploration

Choose the analytical sequence before the widgets. Lead with a supported finding
and visible scope. Give every chart, table, filter, and explanation a purpose;
see [composition](composition.md) and [visualization selection](widgets.md#choose-a-visualization).

## Use release-matched starters

Install `@altertable/data-app-examples` at the same exact version as
`@altertable/data-app` and use its installed templates:

| App                     | Template in `node_modules/@altertable/data-app-examples/templates/` | Guide                                   |
| ----------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| Hosted / remote / cloud | `starter-data-app/index.tsx`                                        | [Single-file authoring](hosted-apps.md) |
| Local                   | `starter-local-data-app`                                            | [Local authoring](local-data-apps.md)   |

For local scaffolding in Node.js or Bun, use `copyExample()` from
`@altertable/data-app-examples` to restore the starter's `.gitignore`. Replace sample queries and connectivity screens with
an exploration of inspected data.

## Build the exploration

1. Define operations, a [view](views.md), and reusable [datasets and metrics](widgets.md#declare-datasets-and-metrics).
2. Expose useful query parameters as [filters](variables.md). Use a date filter
   for time exploration or a fixed period for a historical snapshot. Keep protected
   parameters such as `orgId` in the host/backend.
3. Register [sources, definitions, and evidence](data-context.md).
4. Compose bound widgets with the [standard layout](layout.md). Render the title,
   instructions, and static explanations immediately; load only dynamic content.
5. Supply [story and CSV export](stories-and-export.md) through the built-in
   toolbar. Reuse datasets when several visuals show the same rows.
6. Apply [formatting](formatting-and-appearance.md) and [styling](styling.md)
   through public APIs.

Use sections for related questions, app tabs for distinct analytical questions,
and widget `views` for alternate representations of one dataset. Keep related
results in one declared view; use independent views and `<DataSection>` boundaries
only for separate requests. Keep each filter's scope clear across tabs.

Keep credentials, authorization, and enforced query limits in the host/backend.
Edit app-owned files; installed packages are dependencies.

## Verify the app

- Check findings and visuals against the source population, units, ordering,
  coverage, and user question. Distinguish zero, missing values, and empty results.
- Exercise filters, refresh, loading, empty, error, and stale states. Scope labels,
  story, and export must agree with the displayed result.
- Download CSV and present the story in standalone and embedded use. Check CSV
  columns, raw values, filename, and filter scope.
- Check phone and desktop widths in both themes; follow [UI quality](ui-quality.md).

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

These are the currently shipped runtime starters. Select a use-case starter when
one is supplied by the authoring workflow; otherwise adapt the shared starter's
sample content to the app brief. The hosted starter demonstrates query → operation
→ context → view → dataset → widget composition, including a story example.
Hosted apps stay in one file with public package imports
and a literal `defineDataApp()` declaration. Local apps use the same composition
with their existing server/client wiring. Replace fixture data and connectivity screens; edit
app-owned files, not installed packages.

## Connect data and components

1. **Define the question and scope.** Inspect relevant fields, definitions, time
   coverage, and missing or incomplete observations. Establish the population,
   grain, measures, and comparison. Choose a chart that answers the question.
2. **Replace the starter queries and operation.** Write queries
   against inspected data and preserve supplied metric definitions. Declare `params`
   and result aliases in `projections`. Validate flat operation inputs, execute
   named queries with `query()`, and derive results from its typed rows.
3. **Update context and bindings.** Describe definitions and coverage in the data
   context, using the operation's `queryNames` for evidence. Declare each dataset
   and metric once, with stable row keys, raw column values, and shared formats.
4. **Adapt the view.** Keep related results in one view. Use flat input fields
   matching variable names so `input` and `bindings` can be omitted. Declare
   useful filters in `variables`; `<DataApp>` renders them. Use `defineTimeView()`
   for period-driven analysis and `defineDataView()` otherwise. Split views only
   for independent requests. Keep protected values such as `orgId` backend-owned.
5. **Compose the content.** Follow the app brief for section order and narrative.
   Use `<Stack>` for sections, `<Grid>` for peers, and bound widgets
   from `@altertable/data-app-react`. Keep static explanations outside loading
   boundaries. Use app tabs only for distinct questions and widget `views` only
   for alternate representations of one dataset. Keep default appearance;
   customize when requested. Use custom UI only when bound components cannot
   express the requirement.
6. **Connect shell features.** See [stories and export](stories-and-export.md)
   for the current `<DataApp>` requirements and how to bind these features to the
   displayed result. The app brief determines presentation content and export
   coverage.

Keep credentials, authorization, and enforced query limits in the host/backend.
The starter supplies transport and mounting; change them only for an explicit
integration task.

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

## Look up only what is missing

Search [REFERENCE.md](../REFERENCE.md) for the exact symbol first:

```sh
rg '^LineChart\b' REFERENCE.md
```

Open only the section needed for a requirement the starter does not cover:

| When                                         | Read                                                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Adding categorical, numeric, or time filters | [Variables](variables.md)                                         |
| Adding a chart or narrative binding          | [Widgets](widgets.md)                                             |
| Adding supplemental control hints            | [Tooltips](ui.md#tooltips-and-explanations)                       |
| Adding a detail destination                  | [Detail views](views.md#detail-destinations)                      |
| Registering physical sources                 | [Source identifiers](data-context.md#register-source-identifiers) |
| Customizing appearance or CSS                | [Formatting](formatting-and-appearance.md), [styling](styling.md) |

Keep the starter's working pattern when it meets the requirement. Host integration
guides apply only when building or changing a host.

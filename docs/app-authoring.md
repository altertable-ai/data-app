# Author a data app

Build an exploration that answers the user's question and a story of its strongest
findings. Follow this recipe with the selected starter; keep its runtime wiring.

## Use release-matched starters

Resolve the runtime from the task or existing app once. Use the starter supplied
by the authoring workflow, matched to the app's SDK version.
`@altertable/data-app-examples` ships these templates:

| Runtime                 | Template in `node_modules/@altertable/data-app-examples/templates/` |
| ----------------------- | ------------------------------------------------------------------- |
| Hosted / remote / cloud | `starter-data-app/index.tsx`                                        |
| Local                   | `starter-local-data-app`                                            |

The hosted starter is the canonical query → operation → context → view → dataset
→ widget → story example. Hosted apps stay in one file with public package imports
and a literal `defineDataApp()` declaration. Local apps use the same composition
with their existing server/client wiring. Replace fixture data and connectivity screens; edit
app-owned files, not installed packages.

## Build the exploration

1. **Define the question and scope.** Inspect relevant fields, definitions, time
   coverage, and missing or incomplete observations. Establish the population,
   grain, measures, and comparison. Choose a chart that answers the question.
2. **Replace the starter queries and operation.** Keep supplied registry SQL
   unchanged; otherwise write queries against inspected data. Declare `params`
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
5. **Compose the exploration.** Lead with the strongest supported finding and
   visible scope. Use `<Stack>` for sections, `<Grid>` for peers, and bound widgets
   from `@altertable/data-app-react`. Keep static explanations outside loading
   boundaries. Use app tabs only for distinct questions and widget `views` only
   for alternate representations of one dataset. Keep default appearance;
   customize when requested. Use custom UI only when bound components cannot
   express the requirement.
6. **Adapt the story.** Return one to four supported findings using the same
   bindings and displayed input as the exploration. Supply every distinct
   displayed dataset to `<DataApp datasets={...}>` for CSV export.

Keep credentials, authorization, and enforced query limits in the host/backend.
The starter supplies transport and mounting; change them only for an explicit
integration task.

## Verify the app

Run the authoring workflow's validation, then inspect the app:

- Check findings against the source population, units, ordering, and coverage.
  Distinguish measured zero, missing values, and empty results.
- Change filters and exercise loading, empty, error, refresh, and stale states.
  Narrative, scope, story, and export must agree with the displayed result.
- Present the story and check exported columns, raw values, filename, and scope.
- Check phone and desktop widths, both themes, keyboard use, and overflow.

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
| Adding a detail destination                  | [Detail views](views.md#detail-destinations)                      |
| Registering physical sources                 | [Source identifiers](data-context.md#register-source-identifiers) |
| Customizing appearance or CSS                | [Formatting](formatting-and-appearance.md), [styling](styling.md) |

Keep the starter's working pattern when it meets the requirement. Host integration
guides apply only when building or changing a host.

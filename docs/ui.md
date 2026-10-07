# Direct UI composition

Import from `@altertable/data-app/react/ui` for setup/static screens, custom
controls, or a deliberately custom shell. Standard data apps use declared views
and bound widgets from `/react`.

`<DataApp>` here renders a static screen and accepts optional direct CSV data.
Direct widget forms accept local values or rows. `<DataWidget>` supplies a generic
frame for deliberately custom content. Use `<GettingStarted>` for
connection setup. Fetched data belongs to a declared view; avoid inventing
request states to populate a shell.

Direct `<DateRangePicker>`, `<DimensionPicker>`, and `useAppVariables()` support
custom control ownership. The caller supplies values and change handlers.
Custom tables use `<DataTable>` and its cell helpers; controls and overlays
include `<SearchField>`, `<Combobox>`, `<Tabs>`, `<Sheet>`, and `<HelpPopover>`.

Standalone `<AboutData>`, glossary components, and `<PresentStory>` support
custom inspection and presentation. Supply registered context and evidence, and
derive findings from the displayed data. Standard widgets and `<DataApp>`
already own these experiences.

For framework mounting, `<DataAppProvider>` supplies shared requests and one inspection sheet. Wrap custom shells in it.
Call `injectDataAppStyles()` before mounting either entry; imports do not install
styles.

## Charts

Import `BarChart`, `LineChart`, `AreaChart`, `PieChart`, or `ScatterChart` from
`/react/ui`. Compose the visual inside `<VisualizationWidget dataset={dataset} source={result}>`
so rows, loading state, evidence, and inspection come from that dataset.
Pass ordered items with unique, nonblank IDs and finite numbers. Bar and pie
values must be nonnegative. Use `formatValue` for domain formatting.

Line and area charts show equally spaced samples; include missing periods in the
input. Pie slices represent mutually exclusive parts of one total. Scatter points
represent independent X/Y observations.

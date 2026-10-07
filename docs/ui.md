# Direct UI composition

Import from `@altertable/data-app/react/ui` for setup/static screens, custom
controls, or a deliberately custom shell. Standard data apps use declared views
and bound widgets from `/react`.

`<DataApp>` here renders a static screen and accepts optional direct CSV data.
Direct widget forms accept local values or rows. Use `<GettingStarted>` for
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

For framework mounting, `<DataAppProvider>` supplies the query provider.
Call `injectDataAppStyles()` before mounting either entry; imports do not install
styles.

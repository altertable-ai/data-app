# UI quality

Build a clear reading of the displayed result. Use the [styling contract](styling.md)
and [layout contract](layout.md) for its visual structure.

## Establish hierarchy

Lead with one supported finding and make the displayed scope visible. Group
sections around questions the reader can answer. Explain why a chart matters,
label its measures and units, and provide the relevant source evidence.

Use `<TextContent>` for introductions and section headings. Use the package's
widget title, metric, label, body, and metadata roles instead of inventing sizes
for each element. Keep primary values prominent and supporting text readable.
Use shared formatters and deliberate precision; preserve exact values in records
and exports. Long values must wrap or stay inside a scrollable table.

## Compose responsive content

Parents own external spacing; widgets own internal padding. Use `<Stack>`,
`<Grid>`, and `<VariableBar>` to express those relationships. Add app-owned
classes through `className` for presentation beyond the component's typed props.

Keep prose within its readable measure. Allow headings, descriptions, action
labels, and footer attribution to wrap. Filter bars wrap whole controls; date
fields retain meaningful segment groups. Menus and tables may scroll internally
while the page remains within its viewport. Keep important context available
when a value label truncates.

Density changes spacing, default control height, and padding. Explicit compact
sizes remain compact choices. Text roles retain their readable sizes and use
rem units to honor enlarged text. Fixed chart geometry remains visualization-owned.

## Keep states meaningful

Native and React Aria controls use the same disabled, hover, pressed, selected,
and keyboard focus policies. Selection takes precedence over temporary pointer
states; disabled controls suppress pointer-state paint. Busy actions keep their
labels and geometry and remain distinct from disabled actions. Invalid fields
show an error border and focus treatment, with an accessible explanation.

Static headings and instructions remain visible while data loads. Skeletonize
only values that need data. Refresh, cached errors, and retry preserve the
visible result and its scope. Match loading geometry to the ready composition.

Use native semantics, accessible names, and keyboard behavior through package
components. Verify modal focus and dismissal. Preserve reduced-motion behavior
and system colors in forced-colors mode. Check text and meaningful indicator
contrast after custom color overrides.

## Verify the rendered app

Check phone, tablet, and desktop iframe widths, including 320px. Check light and
dark themes and enlarged text. Include long labels, many filters in the same bar,
large localized numbers, empty results, loading, refresh, and failure.

Confirm page-level horizontal overflow is absent, controls and overlays remain
within bounds, numerical tables scroll inside their frame, and labels remain
accessible. Keyboard through the real controls, including date segments,
calendar cells, menus, and retry actions. Inspect screenshots as well as computed
styles. Apply the same checks to a representative source-backed app with data
that differs from the sample fixtures.

# Styling reference

Use components and props first; see [Styling](styling.md). Public token names:

- **Surfaces:** `--atbl-background`, `--atbl-surface`, `--atbl-subtle`, `--atbl-backdrop`
- **Text and borders:** `--atbl-text`, `--atbl-muted`, `--atbl-border`, `--atbl-control-hover-border` †
- **Accent and selection:** `--atbl-accent`, `--atbl-accent-subtle` †, `--atbl-on-accent`
- **Meaning:** `--atbl-positive` †, `--atbl-negative` †, `--atbl-danger`, `--atbl-danger-subtle`
- **Code:** `--atbl-code-surface`, `--atbl-code-text`, `--atbl-code-keyword` †, `--atbl-mono-font`
- **Charts:** `--atbl-chart-fill` †, `--atbl-chart-1`, `--atbl-chart-2`, `--atbl-chart-3`, `--atbl-chart-4`, `--atbl-chart-5`, `--atbl-chart-6`, `--atbl-chart-7`, `--atbl-chart-8`
- **Focus:** `--atbl-focus-color` †, `--atbl-focus-outline` †, `--atbl-focus-ring-offset`, `--atbl-focus-ring-inset`
- **Typography:** `--atbl-font`, `--atbl-font-heading` †, `--atbl-type-emphasis-weight`, `--atbl-type-meta-weight`, `--atbl-type-page-size`, `--atbl-type-section-size`, `--atbl-type-widget-size`, `--atbl-type-body-size`, `--atbl-type-label-size`, `--atbl-type-meta-size`, `--atbl-type-metric-size`, `--atbl-type-heading-weight`, `--atbl-type-label-weight`, `--atbl-type-body-leading`, `--atbl-type-label-leading`, `--atbl-type-heading-leading`, `--atbl-type-metric-leading`, `--atbl-text-measure`
- **Layout:** `--atbl-space-xs`, `--atbl-space-sm`, `--atbl-space-md`, `--atbl-space-lg`, `--atbl-space-xl`, `--atbl-layout-gap` †, `--atbl-content-width`, `--atbl-control-height`
- **Shape:** `--atbl-radius-control`, `--atbl-radius-surface`, `--atbl-radius-overlay`
- **Elevation:** `--atbl-shadow-surface`, `--atbl-shadow-overlay`, `--atbl-shadow-control`
- **Cursors:** `--atbl-cursor-action`, `--atbl-cursor-disabled`, `--atbl-cursor-help`, `--atbl-cursor-busy`
- **Motion:** `--atbl-duration-fast`, `--atbl-duration-normal`, `--atbl-duration-slow`, `--atbl-ease-standard`, `--atbl-ease-enter`
- **Controls:** `--atbl-control-compact-height`, `--atbl-control-icon-size`, `--atbl-control-padding-inline`, `--atbl-control-padding-block`, `--atbl-control-gap`, `--atbl-control-disabled-opacity`
- **States:** `--atbl-control-hover-surface` †, `--atbl-control-pressed-surface` †, `--atbl-control-selected-surface` †, `--atbl-control-selected-text` †

† Optional component override: its default resolves at consumption, rather than
being an inherited value available to app CSS.

## Stable selectors

Select these roots for CSS customization; render their components rather than
copying the classes. Use `className` for app-owned styles.

| Root                                                          | Owner                             |
| ------------------------------------------------------------- | --------------------------------- |
| `altertable-app-layout`                                       | `<DataApp>` shell                 |
| `altertable-stack`, `altertable-grid`, `altertable-grid-item` | `<Stack>`, `<Grid>`, `<GridItem>` |
| `altertable-text-content`                                     | `<TextContent>`                   |
| `altertable-button`, `altertable-tabs`                        | `<Button>`, `<Tabs>`              |
| `altertable-data-widget`, `altertable-metric-widget`          | Widget roots                      |
| `altertable-data-app-skeleton`                                | `<DataAppSkeleton>`               |

`altertable-sr-only` is a utility for visually hidden accessible text on native markup.

## Native hooks

| Attribute           | Values                   |
| ------------------- | ------------------------ |
| `data-atbl-control` | `action`, `help`, `text` |
| `data-atbl-focus`   | `ring`, `inset`, `group` |

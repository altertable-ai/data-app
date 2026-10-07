# Styling

Data apps use plain CSS and semantic custom properties. The `--atbl-` prefix means
Altertable and keeps the package's styling names separate from host styles.

## Configure appearance

Use `config.appearance` for theme, base palette, accent, chart colors, density,
corner radius, elevation, and typography. `<DataApp>` applies the resolved theme
to its document so overlays and tooltips share it. An iframe host's theme takes
precedence over the viewer's preference. Use one `<DataApp>` per document.

`injectDataAppStyles()` installs component styles and token defaults without
resetting the host page. `<DataApp>` enables the document baseline through
`applyAppearance()`. The appearance cleanup restores previous attributes and
brand inputs and stops system-theme listening.

## Customize tokens

Public `--atbl-*` tokens are the CSS customization contract. Override them on
`:root` to include portaled UI, or on a component for a local adjustment.

```css
:root {
  --atbl-content-width: 1120px;
  --atbl-cursor-action: pointer;
  --atbl-cursor-disabled: default;
  --atbl-control-height: 40px;
}

.altertable-button {
  --atbl-control-height: 40px;
}
```

| Role                 | Tokens                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Surfaces             | `--atbl-background`, `--atbl-surface`, `--atbl-subtle`, `--atbl-backdrop`                                             |
| Text and borders     | `--atbl-text`, `--atbl-muted`, `--atbl-border`, `--atbl-control-hover-border`                                         |
| Accent and selection | `--atbl-accent`, `--atbl-accent-hover`, `--atbl-accent-subtle`, `--atbl-on-accent`                                    |
| Meaning              | `--atbl-positive`, `--atbl-negative`, `--atbl-danger`, `--atbl-danger-subtle`                                         |
| Charts               | `--atbl-chart-1` through `--atbl-chart-8`, `--atbl-chart-fill`                                                        |
| Code                 | `--atbl-code-surface`, `--atbl-code-text`, `--atbl-code-keyword`, `--atbl-mono-font`                                  |
| Typography           | `--atbl-font`, `--atbl-font-heading`                                                                                  |
| Layout               | `--atbl-space-xs` through `--atbl-space-xl`, `--atbl-layout-gap`, `--atbl-content-width`, `--atbl-control-height`     |
| Shape                | `--atbl-radius-control`, `--atbl-radius-surface`, `--atbl-radius-overlay`                                             |
| Elevation            | `--atbl-shadow-control`, `--atbl-shadow-surface`, `--atbl-shadow-overlay`                                             |
| Cursors              | `--atbl-cursor-action`, `--atbl-cursor-disabled`, `--atbl-cursor-help`                                                |
| Focus                | `--atbl-focus-color`, `--atbl-focus-outline`, `--atbl-focus-ring-offset`, `--atbl-focus-ring-inset`                   |
| Motion               | `--atbl-duration-fast`, `--atbl-duration-normal`, `--atbl-duration-slow`, `--atbl-ease-standard`, `--atbl-ease-enter` |

Appearance settings write private brand inputs rather than inline public tokens,
so normal author styles can override the presets. `--atbl-input-*`,
`--atbl-palette-*`, and `--atbl-chart-strength` are internal. Component layout
variables such as `--atbl-grid-column-width` are implementation details.

Chart colors fill eight slots by repeating the configured palette as needed.
Dark themes lighten those colors. Appearance selects a contrasting black or
white foreground for the resolved accent. When overriding `--atbl-accent` directly
in CSS, also choose an appropriate `--atbl-on-accent`; verify contrast for custom
text, surfaces, focus indicators, and chart marks.

Interactive controls use the action cursor; disabled controls use the disabled
cursor; definition triggers use the help cursor. Text fields retain native text
cursors. Keyboard focus is shared across native and React Aria controls.
Reduced-motion styles remain specific to each animation. Forced colors use
system focus and selection foreground colors.

## Maintain component styles

The injected stylesheet declares ordered layers: `atbl.tokens`, `atbl.base`,
`atbl.components`, and `atbl.interaction`. Normal unlayered author CSS overrides
package rules regardless of injection order. System color overrides in forced
colors mode use important declarations.

`src/react/tokens.css` owns semantic defaults and appearance presets.
`base.css` owns component sizing and the document baseline. Component CSS owns
layout and visual states; shared focus and cursor behavior lives in
`ui/Focus.css` and `interaction.css`. The full UI and host skeleton use the same
shared token and component sources.

Consume semantic tokens without literal fallbacks in component styles. Keep
fixed geometry local unless it represents a shared design decision. Style React
Aria states with their data attributes and keep selectors inside package
components. `<Tabs>` provides the scope for tab styling.

Token reference checks run with the unit tests. Browser tests cover host
isolation, author overrides, cursor and focus states, theme and palette changes,
contrast, and appearance cleanup.

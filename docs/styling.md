# Styling

Data apps use plain CSS and semantic custom properties. The `--at-` prefix means
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

Public `--at-*` tokens are the CSS customization contract. Override them on
`:root` to include portaled UI, or on a component for a local adjustment.

```css
:root {
  --at-content-width: 1120px;
  --at-cursor-action: pointer;
  --at-cursor-disabled: default;
  --at-control-height: 40px;
}

.altertable-button {
  --at-control-height: 40px;
}
```

| Role                 | Tokens                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Surfaces             | `--at-background`, `--at-surface`, `--at-subtle`, `--at-backdrop`                                           |
| Text and borders     | `--at-text`, `--at-muted`, `--at-border`, `--at-control-hover-border`                                       |
| Accent and selection | `--at-accent`, `--at-accent-hover`, `--at-accent-subtle`, `--at-on-accent`                                  |
| Meaning              | `--at-positive`, `--at-negative`, `--at-danger`, `--at-danger-subtle`                                       |
| Charts               | `--at-chart-1` through `--at-chart-8`, `--at-chart-fill`                                                    |
| Code                 | `--at-code-surface`, `--at-code-text`, `--at-code-keyword`, `--at-mono-font`                                |
| Typography           | `--at-font`, `--at-font-heading`                                                                            |
| Layout               | `--at-space-xs` through `--at-space-xl`, `--at-layout-gap`, `--at-content-width`, `--at-control-height`     |
| Shape                | `--at-radius-control`, `--at-radius-surface`, `--at-radius-overlay`                                         |
| Elevation            | `--at-shadow-control`, `--at-shadow-surface`, `--at-shadow-overlay`                                         |
| Cursors              | `--at-cursor-action`, `--at-cursor-disabled`, `--at-cursor-help`                                            |
| Focus                | `--at-focus-color`, `--at-focus-outline`, `--at-focus-ring-offset`, `--at-focus-ring-inset`                 |
| Motion               | `--at-duration-fast`, `--at-duration-normal`, `--at-duration-slow`, `--at-ease-standard`, `--at-ease-enter` |

Appearance settings write private brand inputs rather than inline public tokens,
so normal author styles can override the presets. `--at-input-*`,
`--at-palette-*`, and `--at-chart-strength` are internal. Component layout
variables such as `--at-grid-column-width` are implementation details.

Chart colors fill eight slots by repeating the configured palette as needed.
Dark themes lighten those colors. Appearance selects a contrasting black or
white foreground for the resolved accent. When overriding `--at-accent` directly
in CSS, also choose an appropriate `--at-on-accent`; verify contrast for custom
text, surfaces, focus indicators, and chart marks.

Interactive controls use the action cursor; disabled controls use the disabled
cursor; definition triggers use the help cursor. Text fields retain native text
cursors. Keyboard focus is shared across native and React Aria controls.
Reduced-motion styles remain specific to each animation. Forced colors use
system focus and selection foreground colors.

## Maintain component styles

The injected stylesheet declares ordered layers: `at.tokens`, `at.base`,
`at.components`, and `at.interaction`. Normal unlayered author CSS overrides
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

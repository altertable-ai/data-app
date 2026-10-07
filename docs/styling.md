# Styling

Data apps use plain CSS and semantic custom properties. The `--atbl-` prefix means
Altertable and keeps the package's styling names separate from host styles.

## Choose the authoring path

Use components and their typed props first. Add app-owned classes through
`className` for presentation that the component API does not express. Package
root classes are stable CSS customization hooks, not replacements for rendering
their components. Descendant classes and private variables are internal.

| Intent                           | Preferred API                           |
| -------------------------------- | --------------------------------------- |
| Space sections                   | `<Stack gap="…">`                       |
| Arrange peer widgets             | `<Grid>` and `<GridItem>`               |
| Render narrative prose           | `<TextContent>`                         |
| Render an action                 | `<Button variant="…" size="…">`         |
| Style brand, density, or theme   | `config.appearance`, then public tokens |
| Customize one component          | App-owned `className` and public tokens |
| Hide accessible explanatory text | `altertable-sr-only` on native markup   |

```tsx
<Stack gap="md">
  <TextContent>
    <h2>Activity</h2>
    <p>Explore the sources behind this finding.</p>
  </TextContent>
  <Button variant="ghost" className="app-action">
    Explore details
  </Button>
</Stack>
```

Use native control hooks only when a package component does not fit:

```tsx
<button type="button" data-atbl-control="action" data-atbl-focus="ring">
  Run custom action
</button>
```

These hooks provide cursor and focus treatment. Keep native semantics, disabled
state, accessible naming, and keyboard behavior on the actual control. Use
`inset` for focus inside a clipped surface and `group` for an input group whose
wrapper owns the outline.

For inline customization, `DataAppStyle` checks public custom-property names and
`DataAppStyleHooks` checks hook values. Prefer a CSS class for reusable styles.

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

Public `--atbl-*` tokens are the CSS customization contract. The reference marks
inherited theme values and optional component overrides separately. Inherited
values are available to app-owned CSS. Optional entries are component override
points; package styles use native CSS fallbacks where they are consumed, after local
inputs inherit. Override either kind on `:root` for the document or on a
component for a local adjustment. Portaled UI follows its actual DOM ancestors.

```css
:root {
  --atbl-content-width: 1120px;
  --atbl-cursor-action: pointer;
  --atbl-cursor-disabled: default;
  --atbl-control-height: 40px;
  --atbl-focus-color: var(--atbl-accent);
}

.app-action {
  --atbl-control-height: 40px;
}
```

See the [styling reference](style-reference.md) for public tokens, stable root
selectors, and native control hooks.

Appearance settings write private brand inputs rather than inline public tokens,
so normal author styles can override the presets. `--atbl-input-*`,
`--atbl-palette-*`, and `--atbl-chart-strength` are internal. Component layout
variables such as `--atbl-grid-column-width` and derivation inputs such as
`--atbl-accent-subtle-strength` are implementation details. Names outside the
published registry are internal.

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

CSS sources own all default values. `tokens.css` declares inherited theme values;
`appearance.css` owns internal palette primitives and appearance presets.
`src/react/style-contract.ts` lists public names for types and authoring validation.
`base.css` owns component sizing and the document baseline. Component CSS owns
layout and visual states; shared focus and cursor behavior uses explicit `data-atbl-*` hooks in
`ui/Focus.css` and `interaction.css`. The full UI and host skeleton use the same
shared token and component sources.

Consume semantic tokens. Optional overrides use native `var()` fallbacks at their
consumption sites so local colors, fonts, and spacing compose. Keep
fixed geometry local unless it represents a shared design decision. Style React
Aria states with their data attributes and keep selectors inside package
components. `<Tabs>` provides the scope for tab styling.

The build bundles the authored stylesheets and embeds their CSS in the explicit
injector. No token rewriting or reference generation runs during builds. Keep the
public names and reference aligned when adding hooks.

Within the package repository, `bun run check:styles` validates shipped authored
examples; pass file paths or quoted globs to check another app.
Token reference and package control-hook checks run with the unit tests. Browser tests cover host
isolation, author overrides, cursor and focus states, theme and palette changes,
contrast, and appearance cleanup.

## Typography, density, and states

Page, section, widget, body, label, metadata, and metric roles share semantic
sizes. Their rem units honor enlarged text; line heights and weights describe
the role. Use inherited role tokens for custom markup and keep fixed chart
geometry local.

Comfortable controls use a 2.375rem minimum height. Compact and spacious density
use 2.125rem and 2.625rem and adjust padding. Explicit compact component sizes
use their own 1.875rem minimum. Density preserves text size; controls can grow
when their labels wrap.

Package controls own state paint through private surface roles. Hover and
pressed surfaces derive from local inputs; selected state wins over pointer
states; native and Aria disabled states share one opacity and suppress those
surfaces. Busy cursors preserve geometry. Invalid fields derive error focus
locally. Override optional state tokens to customize these defaults.

See [UI quality](ui-quality.md) for hierarchy, responsive composition, state
behavior, and rendered verification.

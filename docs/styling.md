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

Import layouts and `<Button>` from `/react`; direct controls such as `<Tabs>`
and custom widget shells come from `/react/ui`. Standard widgets use declared
views and bindings; see [widgets](widgets.md) and [direct UI composition](ui.md).

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

Appearance settings allow normal author styles to override presets. Use only the
public tokens in the reference; private variables and descendant selectors may
change between package versions.

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

## Override package styles

Package styles use ordered cascade layers. Normal unlayered app CSS overrides
package rules regardless of injection order. Forced-colors styles use system
colors for focus and selection.

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

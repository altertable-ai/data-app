# Styling

Use components and typed props first: `<Stack>` for sections, `<Grid>` for peers,
and `<TextContent>` for prose. Standard widgets use [views and bindings](widgets.md);
custom controls and direct widget shells use [`@altertable/data-app-react/ui`](ui.md).

Configure theme, palette, accent, typography, density, radius, and elevation through
`app.appearance`; see [appearance](formatting-and-appearance.md). Call
`injectDataAppStyles()` before mounting. Use one `<DataApp>` per document.

## Customize

Add app-owned classes through `className`. Render package components rather than copying their classes onto markup;
private descendants are not customization hooks. Public names and stable roots
are listed in the [typed contract](https://github.com/altertable-ai/data-app/blob/main/packages/data-app-react/src/style-contract.ts).

```css
.app-action {
  --atbl-control-height: 40px;
  --atbl-focus-color: var(--atbl-accent);
}
```

Type inline token overrides with `DataAppStyle`. Give optional tokens a `var()`
fallback in app CSS. Use `:root` for shared theme overrides, including menus and overlays.
Prefer `app.appearance` for brand and chart colors. When overriding accent tokens,
choose a contrasting foreground too. Keep text inputs at least 16px on mobile.
Size page content without viewport-height units such as `vh` and `dvh`; a parent
can size the iframe to its content, so those units grow with the content. Use
`<Sheet>` for fixed panels; it stays within the part of the frame the parent shows.

Menus and selection dropdowns share `--atbl-dropdown-padding`,
`--atbl-dropdown-item-padding-block`, `--atbl-dropdown-item-padding-inline`, and
`--atbl-dropdown-item-gap`. Their default padding follows the control density.

## Native controls

Use package controls when possible. For a custom native control:

```tsx
<button type="button" data-atbl-control="action" data-atbl-focus="ring">
  Run
</button>
```

These hooks provide cursor and focus styling; keep accessible names, disabled
state, and keyboard behavior. See
[UI quality](ui-quality.md) for rendered verification.

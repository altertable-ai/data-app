# Styling

Use components and typed props first: `<Stack>` for sections, `<Grid>` for peers,
and `<TextContent>` for prose. Standard widgets use [views and bindings](widgets.md);
custom controls and direct widget shells use [`/react/ui`](ui.md).

Configure theme, palette, accent, typography, density, radius, and elevation through
`app.appearance`; see [appearance](formatting-and-appearance.md). Call
`injectDataAppStyles()` before mounting. Use one `<DataApp>` per document.

## Customize

Add app-owned classes through `className`. Render package components rather than copying their classes onto markup;
private descendants are not customization hooks. Public names and stable roots
are listed in the [typed contract](https://github.com/altertable-ai/data-app/blob/main/src/react/style-contract.ts).

```css
.app-action {
  --atbl-control-height: 40px;
  --atbl-focus-color: var(--atbl-accent);
}
```

Use `DataAppStyle` for checked inline tokens; optional tokens need a `var()` fallback
in app CSS. Set document-wide overrides on `:root`
so portaled menus share the theme; local component overrides stay with the trigger.
Prefer `app.appearance` for brand and chart colors. When overriding accent tokens,
choose a contrasting foreground too. Keep text inputs at least 16px on mobile.

## Native controls

Use package controls when possible. For a custom native control:

```tsx
<button type="button" data-atbl-control="action" data-atbl-focus="ring">
  Run
</button>
```

These hooks provide cursor and focus styling; keep accessible names, disabled
state, and keyboard behavior. `DataAppStyleHooks` checks hook values. See
[UI quality](ui-quality.md) for rendered verification.

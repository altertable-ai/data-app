# Styling

Use components and typed props first: `<Stack>` for sections, `<Grid>` for peers,
and `<TextContent>` for prose. Standard widgets use [views and bindings](widgets.md);
custom controls and direct widget shells use [`/react/ui`](ui.md).

Configure theme, palette, accent, typography, density, radius, and elevation through
`config.appearance`; see [appearance](formatting-and-appearance.md). Call
`injectDataAppStyles()` before mounting. Use one `<DataApp>` per document.

## Customize

Add app-owned classes through `className`. Use only the public tokens and root
selectors in the [reference](style-reference.md); render package components rather
than copying their classes onto native markup. Descendant classes are private.
The `--atbl-` prefix means Altertable.

```css
.app-action {
  --atbl-control-height: 40px;
  --atbl-focus-color: var(--atbl-accent);
}
```

Set tokens on `:root` for the document or on a component for local overrides.
Inherited tokens are usable in app CSS. Optional overrides fall back where they
are consumed, so local colors, fonts, and spacing compose. Portals inherit from
their actual DOM ancestors. Normal unlayered app CSS overrides package rules.
`DataAppStyle` checks public inline custom-property names.

When overriding `--atbl-accent` directly, also choose `--atbl-on-accent` with
sufficient contrast. Prefer appearance configuration for brand and chart colors.

## Native controls

Use package controls when possible. For a custom native control:

```tsx
<button type="button" data-atbl-control="action" data-atbl-focus="ring">
  Run
</button>
```

These hooks provide cursor and focus styling; keep native semantics, accessible
names, disabled state, and keyboard behavior. `DataAppStyleHooks` checks hook
values. Use `inset` focus inside clipped surfaces and `group` when a wrapper owns
an input's outline. See [UI quality](ui-quality.md) for rendered verification.

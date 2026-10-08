# Styling

Use components and typed props first: `<Stack>` for sections, `<Grid>` for peers,
and `<TextContent>` for prose. Standard widgets use [views and bindings](widgets.md);
custom controls and direct widget shells use [`/react/ui`](ui.md).

Configure theme, palette, accent, typography, density, radius, and elevation through
`config.appearance`; see [appearance](formatting-and-appearance.md). Call
`injectDataAppStyles()` before mounting. Use one `<DataApp>` per document.

## Customize

Add app-owned classes through `className`. Render package components rather than copying their classes onto markup;
private descendants are not customization hooks. Public names and stable roots
are listed in the [typed contract](https://github.com/altertable-ai/data-app/blob/main/src/react/style-contract.ts).
CSS comments document [inherited defaults](https://github.com/altertable-ai/data-app/blob/main/src/react/tokens.css),
[interaction overrides](https://github.com/altertable-ai/data-app/blob/main/src/react/interaction.css),
and [focus overrides](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/Focus.css).
Widget-specific overrides live beside their uses in
[metrics](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/MetricWidget.css),
[bar charts](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/BarChart.css),
[code](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/QueryList.css),
and [layout](https://github.com/altertable-ai/data-app/blob/main/src/react/ui/Grid.css).
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

`--atbl-control-text-size` controls editable text, including compact search fields,
date segments, and annotation editors. It defaults to the body text size.
Package controls and custom controls with `data-atbl-control="text"` enforce a
16px minimum on narrow or touch viewports to prevent browser focus zoom. Keep
that minimum when adding app-owned input styles.

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

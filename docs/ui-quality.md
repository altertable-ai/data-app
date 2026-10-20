# UI quality

Lead with a supported finding and visible scope. Explain each chart's purpose,
measures, units, and source evidence. Use package typography and formatters;
keep primary values prominent and preserve exact values in records and exports.

Compose with `<Stack>`, `<Grid>`, and `<TextContent>`; parents own spacing and
widgets own padding. Let labels and values wrap, and keep tables and menus
scrolling inside their frames. Use the [layout](layout.md) and [styling](styling.md)
guides for customization.

Keep static context visible during loading. Skeletonize only dynamic content;
refresh, errors, and retry retain the displayed result and scope. Loading
geometry should match ready content.

The SDK owns standard theme handling, responsive components, and keyboard/focus
behavior for its controls. Review app-owned content at its intended width with realistic labels
and values. When adding custom layout or CSS, check narrow and wide widths for
clipping and overflow; check custom colors in both themes and custom controls
with the keyboard.

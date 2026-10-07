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

Verify a real app at phone and desktop widths, including 320px, in both themes
and with enlarged text. Exercise long labels, localized values, many filters,
and loading, empty, refresh, and error states. Check containment, contrast,
keyboard focus, date/menu navigation, modal dismissal, and reduced motion.
Inspect rendered screenshots as well as computed styles.

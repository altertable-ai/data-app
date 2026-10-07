# Layout contract

The shell owns page width, outer gutters, and header/body spacing. Use `<Stack>`
for sections, `<Grid>` for peer widgets, and `<GridItem>` for spans. Use
`<TextContent>` for prose. Widgets own their internal padding; their parents own
external spacing. Keep widget customization inside the widget so its parent can maintain consistent
spacing between sections and cards.

By default, section and widget gaps use `--atbl-layout-gap`, with density configured once
in `DataAppConfig.appearance`. The package owns wrapping and span collapse based
on the available container width.

```tsx
<Stack>
  <TextContent>
    <h2>Activity</h2>
    <p>Explore the sources behind this finding.</p>
  </TextContent>
  <Grid columns={3}>
    <GridItem span={2}>{activityChart}</GridItem>
    <GridItem>{activityMetric}</GridItem>
  </Grid>
</Stack>
```

## Verify rendered layouts

Check computed section/widget gaps, sibling alignment, outer gutters, and
horizontal overflow at phone and desktop iframe widths. Check loading, empty,
error, ready, and stale states. Loading placeholders should use the same grid as
the ready content.

# Layout contract

The shell owns page width, outer gutters, and header/body spacing. Use `<Stack>`
for sections, `<Grid>` for peer widgets, and `<GridItem>` for spans. Use
`<SectionHeading>` to name widget groups and `<TextContent>` for prose. Widgets own their internal padding; their parents own
external spacing. Keep widget customization inside the widget so its parent can maintain consistent
spacing between sections and cards.

Configure density once in `app.appearance`. `<Grid>` wraps to fit its container;
spans collapse when there is not enough space.

```tsx
<Stack>
  <SectionHeading>Activity</SectionHeading>
  <TextContent>
    <p>Explore the sources behind this finding.</p>
  </TextContent>
  <Grid columns={3}>
    <GridItem span={2}>{activityChart}</GridItem>
    <GridItem>{activityMetric}</GridItem>
  </Grid>
</Stack>
```

Set widget `headingLevel={3}` beneath a section heading; visual styling stays
consistent across widget types.

Use `<DataApp footer={...}>` for an optional source, coverage, or methodology
note below the app content. The footer provides muted prose typography, a readable
line length, and top spacing. Keep static notes outside loading sections.

```tsx
<DataApp {...appProps} footer={<p>Records include the last 90 days.</p>}>
  <DataSection content={content} />
</DataApp>
```

## Verify rendered layouts

Check spacing, alignment, outer gutters, and
horizontal overflow at phone and desktop iframe widths. Check loading, empty,
error, ready, and stale states. Loading placeholders should use the same grid as
the ready content.

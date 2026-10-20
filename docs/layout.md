# Layout

Use `<Stack>` for reading order, `<Grid>` for peer widgets, and `<GridItem>` for
spans. The shell owns page width and gutters; parents own spacing and widgets
own internal padding. Configure density once in `app.appearance`.

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

Grids wrap to fit their container and spans collapse when needed. Set widget
`headingLevel={3}` beneath a section heading.

Use `<DataApp footer={...}>` for static source, coverage, or methodology notes.
Compose paragraphs, links, and inline components directly; no `<TextContent>`
wrapper is needed. Keep headings and widgets in the body and controls in
`footerActions`.

## Verify rendered layouts

Check spacing, alignment, and overflow at phone and desktop iframe widths.
Keep the same grid during loading and ready states; see [UI quality](ui-quality.md).

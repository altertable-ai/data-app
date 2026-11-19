# Layout

Use `<Stack>` for reading order, `<Grid>` for peer widgets, and `<GridItem>` for
spans. The shell owns page width and gutters; parents own spacing and widgets
own internal padding. Lay out sections the same way as widgets; static headings
and prose stay outside their loading boundaries. Keep default density unless
customization is requested.

```tsx
// ... sampleCountsView, countsContent, and totalContent
function App() {
  return (
    <DataApp view={sampleCountsView}>
      <Stack>
        <SectionHeading>Sample counts</SectionHeading>
        <TextContent>
          <p>Explore the sources behind this finding.</p>
        </TextContent>
        <Grid columns={3}>
          <GridItem span={2}>
            <DataSection content={countsContent} />
          </GridItem>
          <GridItem>
            <DataSection content={totalContent} />
          </GridItem>
        </Grid>
      </Stack>
    </DataApp>
  );
}
```

Grids wrap to fit their container and spans collapse when needed. Set widget
`headingLevel={3}` beneath a section heading.

Use `<DataApp footer={...}>` for static source, coverage, or methodology notes.
Compose paragraphs, links, and inline components directly; no `<TextContent>`
wrapper is needed. Keep headings and widgets in the body and controls in
`footerActions`.

Embedded hosts supply the page chrome, so `<DataApp>` omits its header, footer,
`toolbarActions`, and `footerActions` there; the host runs refresh, export,
story, and inspection. Keep controls readers need in the body.

## Adapt to the available container

Base layout decisions on the app's available width. An embedded panel can be
narrow inside a wide browser window. Use `<Grid>` and `<GridItem>` first: their
tracks and spans respond to the containing grid rather than a viewport breakpoint.
Choose the column count and reading order for the evidence in the app brief.

For custom layout that these primitives cannot express, give an app-owned wrapper
`container-type: inline-size` and, when needed, a `container-name`. Use CSS
`@container` queries to adapt its descendants to that wrapper's width. The
container must be an ancestor of the elements whose layout changes. Keep theme
and user-preference media queries separate from these width decisions.

Apply the same composition and container rules to hosted and local apps. Verify
both a narrow browser and a narrow embed inside a wide browser; neither should
clip controls or require horizontal page scrolling.

## Verify rendered layouts

Review authored composition with realistic labels and values. For custom layout
or sizing, check spacing and overflow at narrow and wide iframe widths. Keep
the same grid during loading and ready states.

export const galleryCategories = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'A dashboard that answers the next question',
    description:
      'Start with a finding, compare the headline metrics, then inspect the trend and the records behind it.',
    uses: [
      'Weekly business review',
      'Product activity',
      'Operations monitoring',
    ],
  },
  {
    id: 'widgets',
    label: 'Widgets',
    title: 'Explore the visualization library',
    description:
      'One basic example of each chart and custom visualization, using the same widget frame.',
    uses: [
      'Choose a visualization',
      'Compare components',
      'Iterate on designs',
    ],
  },
  {
    id: 'filters',
    label: 'Filters & actions',
    title: 'Give readers a useful way into the data',
    description:
      'Search records, choose a segment, and compare periods. These controls let a reader move from a broad question to a precise answer.',
    uses: ['Segment investigation', 'Period comparison', 'Live monitoring'],
  },
  {
    id: 'metrics',
    label: 'Metrics',
    title: 'Make performance easy to read',
    description:
      'Show the unit, the baseline, and the direction that matters. Explore counts, conversion rates, currencies, and unavailable readings.',
    uses: ['Executive scorecard', 'Conversion tracking', 'Revenue reporting'],
  },
  {
    id: 'collections',
    label: 'Tables & charts',
    title: 'Move from a pattern to the records behind it',
    description:
      'Choose a trend, a ranking, a share of total, or a searchable table to match the question your reader is asking.',
    uses: ['Trend exploration', 'Segment prioritization', 'Record audit'],
  },
  {
    id: 'states',
    label: 'Request states',
    title: 'Keep the investigation moving',
    description:
      'Communicate loading, empty results, and failures clearly. Replay the transitions and see how useful results survive a failed refresh.',
    uses: ['First load', 'Refresh & recovery', 'No matching results'],
  },
  {
    id: 'evidence',
    label: 'Stories & evidence',
    title: 'Turn a result into a trusted finding',
    description:
      'Connect a claim to its definition and query, add helpful context, and present the strongest findings as a story.',
    uses: ['Source inspection', 'Metric definitions', 'Stakeholder readout'],
  },
  {
    id: 'layout',
    label: 'App layout',
    title: 'Compose an app for every surface',
    description:
      'Give the app a clear identity and a flexible layout. Review page chrome, constrained containers, and the full semantic icon vocabulary.',
    uses: ['Embedded dashboard', 'Mobile exploration', 'App composition'],
  },
] as const;

export type GalleryCategory = (typeof galleryCategories)[number]['id'];

export const gallerySections: Record<
  string,
  {
    category: GalleryCategory;
    description: string;
    frame: string;
  }
> = {
  buttons: {
    category: 'filters',
    description:
      'Let readers find records, include archived data, and take action. Compare action hierarchy, selection marks, and search states.',
    frame: 'controls',
  },
  'picker-edges': {
    category: 'filters',
    description:
      'Narrow an investigation by source or segment. Try selection limits, unavailable values, large lists, and recovery without losing choices.',
    frame: 'controls',
  },
  dates: {
    category: 'filters',
    description:
      'Compare reporting periods or monitor a live operation. Pair a date range with a comparison, then make freshness explicit.',
    frame: 'controls',
  },
  metrics: {
    category: 'metrics',
    description:
      'Track growth, conversion, and revenue. Choose a format and baseline that make the result meaningful; keep missing values distinct from measured zero.',
    frame: 'metric',
  },
  tables: {
    category: 'collections',
    description:
      'Review an operations queue or audit individual records. Search and paginate long results, preserve headers when empty, and show timestamps and shares.',
    frame: 'widget',
  },
  charts: {
    category: 'collections',
    description:
      'Inspect trends, prioritize top segments with a ranking, or explain a whole with a breakdown. Explore zero, ties, and empty results.',
    frame: 'visual',
  },
  refresh: {
    category: 'states',
    description:
      'Monitor a changing dataset without losing your place. Replay refresh, failure, and recovery while the last successful result stays visible.',
    frame: 'widget',
  },
  requests: {
    category: 'states',
    description:
      'Recover a failed investigation. Compare first load, no results, refresh, and stale results at page and section boundaries.',
    frame: 'content',
  },
  'empty-loading': {
    category: 'states',
    description:
      'Explain what a reader can do next when data is missing. Match skeletons to the content they replace and make retry actions easy to find.',
    frame: 'widget',
  },
  text: {
    category: 'evidence',
    description:
      'Explain results with prose that follows the displayed selection.',
    frame: 'widget',
  },
  overlays: {
    category: 'evidence',
    description:
      'Help readers trust and share a finding. Inspect definitions and SQL, open detailed views, and turn supported findings into a presentation.',
    frame: 'content',
  },
  chrome: {
    category: 'layout',
    description:
      'Establish the organization, environment, and reporting context. Compose toolbars, typed filters, refresh controls, and attribution.',
    frame: 'page',
  },
  layout: {
    category: 'layout',
    description:
      'Build dashboards that work in an iframe or on a phone. Try long labels, narrow widgets, spanning columns, and overflowing content.',
    frame: 'page',
  },
  icons: {
    category: 'layout',
    description:
      'Choose consistent visual language for actions, states, and data. Every semantic icon is shown with its exported name.',
    frame: 'icons',
  },
};

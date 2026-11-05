import { defineDataApp } from '@altertable/data-app';
import {
  createDataContext,
  createDataHooks,
  DataApp,
  DataSection,
  injectDataAppStyles,
  mountDataApp,
  searchVariable,
  Stack,
} from '@altertable/data-app-react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import { Component, type ReactNode } from 'react';

type RegionCount = DataOperation<{ region: string }, { count: number }>;

/** The transport stands in for the network and records each request as `name:region`.
 * `?failing=<operation>`, or later `document.body.dataset.failing`, makes that operation fail. */
const client = createDataClient<{
  summary: RegionCount;
  trend: RegionCount;
  breakdown: RegionCount;
}>({
  async transport(name, input) {
    const { region } = input as { region: string };
    const requests = document.body.dataset.requests;
    document.body.dataset.requests = [requests, `${name}:${region}`]
      .filter(Boolean)
      .join(' ');
    const failing =
      document.body.dataset.failing ??
      new URLSearchParams(location.search).get('failing');
    if (failing === name) return { status: 503, body: {} };
    return {
      status: 200,
      body: {
        data: { count: region.length },
        requestId: `${name}:${region}`,
        queriedAt: '2026-11-05T00:00:00Z',
        queryIds: [],
        queries: [{ name, statement: `SELECT ${name}` }],
      },
    };
  },
});
const { defineDataView } = createDataHooks(client);
const dataContext = createDataContext({
  summary: 'summary',
  trend: 'trend',
  breakdown: 'breakdown',
})({ description: 'One operation per section', glossary: {} });
const variables = {
  region: searchVariable({ key: 'region', label: 'Region', defaultValue: '' }),
};

const sectionOptions = {
  dataContext,
  variables,
  describeInput: ({ region }: { region: string }) => region || 'all regions',
};
const summaryView = defineDataView({
  ...sectionOptions,
  operation: 'summary',
  emptyFallback: { title: 'No summary' },
});
const trendView = defineDataView({
  ...sectionOptions,
  operation: 'trend',
  emptyFallback: { title: 'No trend' },
});
const breakdownView = defineDataView({
  ...sectionOptions,
  operation: 'breakdown',
  emptyFallback: { title: 'No breakdown' },
});

function RegionResult({ title, region }: { title: string; region: string }) {
  return (
    <output aria-label={`${title} result`}>
      {title} for {region || 'all regions'}
    </output>
  );
}
const summaryContent = summaryView.content(
  result =>
    !result.loading && <RegionResult title="Summary" {...result.input} />
);
const trendContent = trendView.content(
  result => !result.loading && <RegionResult title="Trend" {...result.input} />
);
const breakdownContent = breakdownView.content(
  result =>
    !result.loading && <RegionResult title="Breakdown" {...result.input} />
);

export const dataApp = defineDataApp({
  title: 'Lazy sections',
  description:
    'Each section runs its own operation when it nears the viewport.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});

const breakdownCounts = breakdownView.dataset({
  name: 'Breakdown',
  select: data => [data],
  rowKey: () => 'breakdown',
  columns: { count: { value: row => row.count } },
  evidence: { id: 'breakdown', queryNames: ['breakdown'] },
});

const unfilteredSummaryView = defineDataView({
  dataContext,
  operation: 'summary',
  input: () => ({ region: '' }),
  describeInput: () => 'all regions',
});

const search = new URLSearchParams(location.search);
/** `?summary` lets the story and export read the far-away breakdown section. */
const summarizesBreakdown = search.has('summary');
/** `?unfiltered-app` gives the app view none of the sections' filters. */
const appView = search.has('unfiltered-app')
  ? unfilteredSummaryView
  : summaryView;

/** Shows authoring invariants as text so tests can read them. */
class AuthoringBoundary extends Component<
  { children: ReactNode },
  { message: string }
> {
  override state = { message: '' };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }
  override render() {
    return this.state.message ? (
      <p role="alert">{this.state.message}</p>
    ) : (
      this.props.children
    );
  }
}

function App() {
  const sections = (
    <Stack>
      <DataSection content={summaryContent} label="Summary section" />
      <DataSection content={trendContent} label="Trend section" />
      <div style={{ height: '300vh' }} />
      <DataSection content={breakdownContent} label="Breakdown section" />
    </Stack>
  );
  return (
    <AuthoringBoundary>
      {summarizesBreakdown ? (
        <DataApp
          view={appView}
          summaryViews={[breakdownView]}
          datasets={[breakdownCounts]}
          story={(_summary, breakdown) => [
            {
              id: 'breakdown',
              headline: `Breakdown for ${breakdown.input.region || 'all regions'}`,
              visual: <RegionResult title="Breakdown" {...breakdown.input} />,
              evidence: breakdownCounts,
            },
          ]}
        >
          {sections}
        </DataApp>
      ) : (
        <DataApp view={appView}>{sections}</DataApp>
      )}
    </AuthoringBoundary>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

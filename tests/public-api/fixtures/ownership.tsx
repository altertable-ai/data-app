import { defineDataApp } from '@altertable/data-app/config';
import { Component, type ReactNode } from 'react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  MetricWidget,
  TableWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app/react';
const dataApp = defineDataApp({
  title: 'Binding ownership',
  scope: { organization: 'test', environment: 'test' },
  appearance: {},
  queries: {},
});
const context = createDataContext({ rows: 'rows' })({
  description: 'Same-shaped views with separate ownership',
  glossary: {
    count: { term: 'Count', definition: 'Measured rows', queryNames: ['rows'] },
  },
});
const hooks = createDataHooks(
  createDataClient<{
    rows: DataOperation<Record<string, never>, number>;
  }>({
    async transport() {
      return {
        status: 200,
        body: {
          data: 7,
          requestId: 'rows',
          queriedAt: '2026-10-07T00:00:00Z',
          queryIds: [],
          queries: [],
        },
      };
    },
  })
);
function declareView() {
  const view = hooks.defineDataView({
    dataContext: context,
    operation: 'rows',
    describeInput: () => 'all rows',
    isEmpty: () => false,
    emptyFallback: { title: 'No rows' },
  });
  const dataset = view.dataset({
    name: 'Rows',
    select: count => [{ count }],
    rowKey: () => 'count',
    columns: { count: { value: row => row.count } },
    evidence: { id: 'rows', glossaryIds: ['count'] },
  });
  const metric = view.metric(
    {
      id: 'count',
      label: 'Count',
      glossaryId: 'count',
      format: { kind: 'count' },
    },
    count => ({ current: count })
  );
  return { view, dataset, metric };
}
const own = declareView();
const other = declareView();
const binding = new URLSearchParams(location.search).get('binding');
const content = own.view.content(source => (
  <>
    <MetricWidget
      metric={binding === 'metric' ? other.metric : own.metric}
      source={source}
    />
    <TableWidget
      title="Rows"
      dataset={binding === 'dataset' ? other.dataset : own.dataset}
      source={source}
    />
  </>
));
class AuthoringBoundary extends Component<
  { children: ReactNode },
  { message: string }
> {
  state = { message: '' };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }
  render() {
    return this.state.message ? (
      <p role="alert">{this.state.message}</p>
    ) : (
      this.props.children
    );
  }
}
function App() {
  return (
    <AuthoringBoundary>
      <DataApp
        view={own.view}
        datasets={[binding === 'export' ? other.dataset : own.dataset]}
        story={snapshot => [
          {
            id: 'count',
            headline: 'Measured count',
            context: 'Count from the displayed view',
            visual: <MetricWidget metric={own.metric} source={snapshot} />,
            visualKind: 'metric',
            evidence:
              binding === 'story-metric'
                ? other.metric
                : binding === 'story-dataset'
                  ? other.dataset
                  : own.metric,
          },
        ]}
      >
        <DataSection content={content} />
      </DataApp>
    </AuthoringBoundary>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

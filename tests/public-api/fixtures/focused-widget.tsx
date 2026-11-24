import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  SectionHeading,
  TableWidget,
  TextWidget,
  VisualizationWidget,
  mountDataApp,
} from '@altertable/data-app-react';
import {
  searchFilter,
  type DataOperation,
  type FilterInput,
} from '@altertable/data-app/contract';
import { use, useEffect, useState } from 'react';

import {
  createTransportFixtureClient,
  fixtureHttpTransport,
} from '@/tests/public-api/fixtures/transport-client';

const dataApp = defineDataApp({
  title: 'Sales report',
  appearance: { theme: 'system' },
  description: 'Activity and revenue for the current period.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
const activityFilters = {
  region: searchFilter({ key: 'region', label: 'Region', defaultValue: '' }),
};
const { defineView, defineDetailView } = createDataHooks(
  createTransportFixtureClient<{
    activity: DataOperation<FilterInput<typeof activityFilters>, number[]> & {
      filters: typeof activityFilters;
    };
    revenue: DataOperation<Record<string, never>, number>;
    detail: DataOperation<{ region: string }, number>;
  }>({
    filters: { activity: activityFilters },
    transport: fixtureHttpTransport('/focused-widget-data'),
  })
);
const dataContext = createDataContext({
  activity: 'activity',
  revenue: 'revenue',
  detail: 'detail',
})({
  description: 'Sales activity and revenue',
  glossary: {
    events: {
      term: 'Events',
      definition: 'Recorded events',
      queryNames: ['activity'],
    },
    revenue: {
      term: 'Revenue',
      definition: 'Booked revenue',
      queryNames: ['revenue'],
    },
  },
});
const activity = defineView({
  dataContext,
  operation: 'activity',
  emptyFallback: { title: 'No activity' },
});
const eventLog = activity.dataset<{ day: number; count: number }>({
  name: 'Event log',
  select: rows => rows.map((count, day) => ({ day: day + 1, count })),
  rowKey: row => row.day,
  columns: {
    day: { label: 'Day', value: row => row.day },
    count: { label: 'Count', value: row => row.count },
  },
  evidence: { id: 'event-data', glossaryIds: ['events'] },
});
const revenueView = defineView({ dataContext, operation: 'revenue' });
const revenueMetric = revenueView.metric(
  {
    id: 'revenue',
    label: 'Revenue',
    glossaryId: 'revenue',
    format: { kind: 'count' },
  },
  total => ({ current: total })
);
const detail = defineDetailView({
  id: 'region-detail',
  dataContext,
  operation: 'detail',
  title: 'Region detail',
  parseInput: (input: unknown) => input as { region: string },
});
const detailContent = detail.content(source => (
  <p>{source.loading ? 'Loading detail' : `Region total ${source.data}`}</p>
));
const events = activity.content(
  source => (
    <TableWidget
      dataset={eventLog}
      source={source}
      annotationId="table-annotation"
      pagination={{ pageSize: 1 }}
    />
  ),
  { id: 'event-log' }
);
activity.content(
  source => (
    <TextWidget
      title="Busiest day"
      dataset={eventLog}
      source={source}
      annotationId="different-annotation"
    >
      {rows =>
        `Day ${rows.toSorted((a, b) => b.count - a.count)[0]?.day} in ${source.input?.region || 'all regions'}`
      }
    </TextWidget>
  ),
  { id: 'busiest-day' }
);
const revenue = revenueView.content(
  source => (
    <TextWidget title="Revenue" metric={revenueMetric} source={source}>
      {metric => `${metric.current}`}
    </TextWidget>
  ),
  { id: 'revenue' }
);
activity.content(
  source => (
    <VisualizationWidget
      title="Broken chart"
      dataset={eventLog}
      source={source}
    >
      {() => {
        throw new Error('Chart renderer failed');
      }}
    </VisualizationWidget>
  ),
  { id: 'broken' }
);
activity.content(
  source => (
    <VisualizationWidget
      title="Deferred chart"
      dataset={eventLog}
      source={source}
    >
      {rows => (
        <DeferredChart total={rows.reduce((sum, row) => sum + row.count, 0)} />
      )}
    </VisualizationWidget>
  ),
  {
    id: 'custom',
    waitForReady(element, signal) {
      if (element.querySelector('#chart-result')) return;
      return new Promise<void>((resolve, reject) => {
        element.addEventListener('chart-ready', () => resolve(), {
          once: true,
          signal,
        });
        element.addEventListener(
          'chart-error',
          () => reject(new Error('Drawing failed')),
          { once: true, signal }
        );
      });
    },
  }
);

function DeferredChart({ total }: { total: number }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    function finish() {
      setDrawn(true);
    }
    function fail() {
      document
        .getElementById('chart-drawing')
        ?.dispatchEvent(new Event('chart-error', { bubbles: true }));
    }
    window.addEventListener('fixture-finish-drawing', finish);
    window.addEventListener('fixture-fail-drawing', fail);
    return () => {
      window.removeEventListener('fixture-finish-drawing', finish);
      window.removeEventListener('fixture-fail-drawing', fail);
    };
  }, []);
  useEffect(() => {
    if (drawn)
      document
        .getElementById('chart-result')
        ?.dispatchEvent(new Event('chart-ready', { bubbles: true }));
  }, [drawn]);
  return (
    <div id="chart-drawing">
      <button type="button" onClick={() => setDrawn(true)}>
        Finish drawing
      </button>
      {drawn && <output id="chart-result">Chart total {total}</output>}
    </div>
  );
}

activity.content(() => <SuspendingChart />, { id: 'suspending' });

function SuspendingChart() {
  const [reload, setReload] = useState<Promise<void>>();
  useEffect(() => {
    const controller = new AbortController();
    function start() {
      const { promise, resolve } = Promise.withResolvers<void>();
      window.addEventListener('fixture-resume-chart', () => resolve(), {
        once: true,
        signal: controller.signal,
      });
      setReload(promise);
    }
    window.addEventListener('fixture-reload-chart', start, {
      signal: controller.signal,
    });
    return () => controller.abort();
  }, []);
  return reload ? <ReloadedChart reload={reload} /> : <p>Chart drawn</p>;
}

function ReloadedChart({ reload }: { reload: Promise<void> }) {
  use(reload);
  return <p>Chart reloaded</p>;
}

function Dashboard() {
  useEffect(() => {
    document.body.dataset.dashboardMounted = 'yes';
  }, []);
  return (
    <>
      <SectionHeading>Activity overview</SectionHeading>
      <DataSection content={events} />
      <SectionHeading>Revenue overview</SectionHeading>
      <DataSection content={revenue} />
    </>
  );
}

function App() {
  const duplicate = new URLSearchParams(location.search).has('duplicate');
  if (duplicate) activity.content(() => null, { id: 'event-log' });
  return (
    <DataApp view={revenueView} details={[detailContent]}>
      <Dashboard />
    </DataApp>
  );
}
mountDataApp({ app: dataApp, component: App });

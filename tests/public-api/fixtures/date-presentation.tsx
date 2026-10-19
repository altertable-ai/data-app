import { defineDataApp } from '@altertable/data-app';
import { createDataClient } from '@altertable/data-app/client';
import {
  defineDateRangeContract,
  type DataOperation,
  type DateRangeRequest,
} from '@altertable/data-app/contract';
import { formatTime } from '@altertable/data-app/format';
import {
  DataApp as StaticDataApp,
  LineChart,
  DataTableTimestamp,
} from '@altertable/data-app-react/ui';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TableWidget,
  MetricWidget,
  TextWidget,
  VisualizationWidget,
  DateDisplay,
  SectionHeading,
  TextContent,
  Stack,
  Grid,
  useDateFormatting,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app-react';

const records = [
  {
    id: 1,
    day: '2026-09-24',
    observed: '2026-09-24T15:00:05Z',
    ambiguous: '2026-09-24 15:00:05',
  },
  {
    id: 2,
    day: '2026-09-24',
    observed: '2026-09-24T15:15:05Z',
    ambiguous: '2026-09-24 15:15:05',
  },
  {
    id: 3,
    day: '2026-09-24',
    observed: '2026-09-24T15:30:05Z',
    ambiguous: '2026-09-24 15:30:05',
  },
];
const calendar = defineDateRangeContract({
  minDate: '2026-09-01',
  maxDate: '2026-09-30',
  maxRangeDays: 30,
  timeZone: 'America/New_York',
});
const client = createDataClient<{
  events: DataOperation<DateRangeRequest, typeof records>;
}>({
  async transport() {
    return {
      status: 200,
      body: {
        data: records,
        requestId: 'events',
        queriedAt: '2026-09-24T15:05:00Z',
        queryIds: [],
        queries: [],
      },
    };
  },
});
const view = createDataHooks(client).defineTimeView({
  dataContext: createDataContext({ events: 'events' })({
    description: 'Sample dated events.',
    glossary: {
      events: {
        term: 'Events',
        definition: 'Events in the reporting period',
        queryNames: ['events'],
      },
    },
  }),
  operation: 'events',
  time: {
    contract: calendar,
    defaultValue: { kind: 'dates', start: '2026-09-24', end: '2026-09-24' },
  },
  isEmpty: () => false,
  emptyFallback: { title: 'No events' },
});
const events = view.dataset({
  name: 'Witness reports',
  select: rows => rows,
  rowKey: row => row.id,
  columns: {
    day: {
      label: 'Calendar date',
      value: row => row.day,
      format: { kind: 'date' },
    },
    observed: {
      label: 'Observed',
      value: row => row.observed,
      format: { kind: 'dateTime', precision: 'second' },
    },
    utc: {
      label: 'UTC',
      value: row => row.observed,
      format: { kind: 'dateTime', timeZone: 'UTC', precision: 'second' },
    },
    ambiguous: {
      label: 'Ambiguous timestamp',
      value: row => row.ambiguous,
      format: { kind: 'dateTime' },
    },
  },
  evidence: { id: 'events', glossaryIds: ['events'] },
});
const tokyoView = createDataHooks(client).defineTimeView({
  dataContext: createDataContext({ events: 'events' })({
    description: 'Independent Tokyo events.',
    glossary: {},
  }),
  operation: 'events',
  time: {
    contract: defineDateRangeContract({
      minDate: '2026-09-01',
      maxDate: '2026-09-30',
      maxRangeDays: 30,
      timeZone: 'Asia/Tokyo',
    }),
    defaultValue: { kind: 'dates', start: '2026-09-24', end: '2026-09-24' },
  },
  isEmpty: () => false,
  emptyFallback: { title: 'No Tokyo events' },
});
const tokyoEvents = tokyoView.dataset({
  name: 'Tokyo events',
  select: rows => rows,
  rowKey: row => row.id,
  columns: { observed: { value: row => row.observed } },
  evidence: { id: 'tokyo-events', queryNames: ['events'] },
});
const tokyoContent = tokyoView.content(source => (
  <VisualizationWidget
    dataset={tokyoEvents}
    source={source}
    title="Tokyo timestamp"
    headingLevel={3}
  >
    {rows => <DateDisplay value={rows[0]?.observed} />}
  </VisualizationWidget>
));
const count = view.metric(
  { id: 'count', glossaryId: 'events', format: { kind: 'count' } },
  rows => ({ current: rows.length })
);
function TimeLabels() {
  const formatting = useDateFormatting();
  return (
    <LineChart
      ariaLabel="Events through the day"
      unit="events"
      items={records.map(row => ({
        id: String(row.id),
        label: formatTime(row.observed, formatting),
        value: 1,
      }))}
    />
  );
}
const content = view.content(source => (
  <Stack>
    <SectionHeading>Event overview</SectionHeading>
    <Grid columns={2}>
      <MetricWidget metric={count} source={source} headingLevel={3} />
      <TextWidget
        title="Busiest bucket"
        dataset={events}
        source={source}
        headingLevel={3}
      >
        {rows => <DateDisplay value={rows[0]?.observed} />}
      </TextWidget>
    </Grid>
    <VisualizationWidget
      dataset={events}
      source={source}
      title="Street timeline"
      headingLevel={3}
    >
      {() => <TimeLabels />}
    </VisualizationWidget>
    <TableWidget
      dataset={events}
      source={source}
      headingLevel={3}
      pagination={false}
    />
  </Stack>
));
const dataApp = defineDataApp({
  title: 'Dates and headings',
  description: 'Readable dates and a consistent heading hierarchy.',
  scope: { organization: 'Demo', environment: 'Preview' },
  dateFormatting: { locale: 'en-GB', timeZone: 'Europe/Paris' },
  queries: {},
});
function App() {
  if (new URLSearchParams(location.search).has('appDefaults')) {
    return (
      <StaticDataApp
        dataContext={{
          description: 'App date formatting defaults.',
          glossary: {},
        }}
      >
        <TextContent>
          <SectionHeading>Date display defaults</SectionHeading>
          <p>
            Prose: <DateDisplay value={records[0]!.observed} />
          </p>
          <p>
            Table timestamp:{' '}
            <span aria-label="Table timestamp">
              <DataTableTimestamp
                value={records[0]!.observed}
                precision="second"
              />
            </span>
          </p>
        </TextContent>
      </StaticDataApp>
    );
  }
  return (
    <DataApp
      view={view}
      datasets={[events]}
      story={source => [
        {
          id: 'events',
          headline: 'Dated events',
          context: 'The displayed reporting period.',
          visual: (
            <TableWidget dataset={events} source={source} pagination={false} />
          ),
          evidence: events,
        },
      ]}
    >
      <DataSection content={content} />
      <DataSection content={tokyoContent} />
    </DataApp>
  );
}

injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

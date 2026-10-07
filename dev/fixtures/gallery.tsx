import { GalleryBasics } from '@/dev/fixtures/gallery-basics';
import { GalleryCases } from '@/dev/fixtures/gallery-cases';
import {
  galleryCategories,
  gallerySections,
} from '@/dev/fixtures/gallery-catalog';
import { useEffect, useState } from 'react';
import type { DataAppConfig } from '@altertable/data-app/config';
import { getDataAppNavigation } from '@altertable/data-app/client';
import {
  DataApp,
  HelpPopover,
  MetricWidget,
  Checkbox,
  Combobox,
  DataWidget,
  SearchField,
  TableWidget,
  VisualizationWidget,
  TextWidget,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  useViewTab,
} from '@altertable/data-app/react/ui';
import { injectDataAppStyles } from '@altertable/data-app/react/ui';
import {
  PeriodSummary,
  Breakdown,
  Ranking,
  Button,
  Grid,
  Stack,
  Tooltip,
  TextContent,
} from '@altertable/data-app/react';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { type WidgetEvidence, mountDataApp } from '@altertable/data-app/react';
import { BarChart } from '@altertable/data-app/react/ui';
import { bindDataset } from '@/src/react/bindings';
import { defineDataContent } from '@/src/react/content';
import { DataBoundary } from '@/src/react/ui/DataBoundary';
import { resolveDataView } from '@/src/core/data-view';
import { writeSearch } from '@/src/react/ui/search';

const options = [
  { id: 'http', label: 'HTTP' },
  { id: 'postgres', label: 'Postgres' },
  { id: 'other', label: 'Other' },
];
const evidence: WidgetEvidence = {
  id: 'gallery-trend',
  glossaryIds: ['activity'],
  queryNames: ['gallery-trend'],
};
const recordsEvidence: WidgetEvidence = {
  id: 'gallery-records',
  glossaryIds: ['activation'],
  queryNames: ['gallery-records'],
};
const bars = [
  { id: 'monday', label: 'Monday', value: 12 },
  { id: 'tuesday', label: 'Tuesday', value: 0 },
  { id: 'wednesday', label: 'Wednesday', value: 8 },
];
const workspaces = [
  'Northstar',
  'Acme',
  'Lumen',
  'Atlas',
  'Orbit',
  'Beacon',
  'Cedar',
  'Delta',
  'Ember',
  'Fern',
  'Grove',
  'Harbor',
  'Iris',
  'Juniper',
  'Kite',
  'Lagoon',
  'Maple',
  'Nova',
  'Opal',
  'Pine',
  'Quartz',
  'Reed',
  'Sol',
];
const rows = workspaces.map((name, id) => ({
  id,
  name,
  source: id % 2 === 0 ? 'HTTP' : 'Postgres',
  events: id === 0 ? 12 : id === 1 ? 8 : 0,
}));
const config = {
  title: 'Data app gallery',
  scope: { organization: 'Demo workspace', environment: 'Sample data' },
  appearance: { theme: 'light' },
} satisfies DataAppConfig;
const dataContext = {
  description:
    'Synthetic sample data for exploring data app patterns. The overview is a fixed September 28–30, 2026 snapshot; other tabs demonstrate independent component states. Sample SQL documents the fixture data and does not query a live source.',
  glossary: {
    activity: {
      term: 'Recorded events',
      definition:
        'Events recorded during the sample period. A value of zero means no events were recorded that day.',
      queryNames: ['gallery-trend'],
    },
    activation: {
      term: 'Workspace activation',
      definition:
        'Share of the 23 tracked workspaces with at least one recorded event in the sample period: 2 ÷ 23.',
      queryNames: ['gallery-records'],
    },
  },
};
const queries = [
  {
    name: 'gallery-trend',
    statement:
      "SELECT * FROM (VALUES ('Monday', 12), ('Tuesday', 0), ('Wednesday', 8)) AS sample_activity(day, events)",
    queryId: 'sample-trend',
  },
  {
    name: 'gallery-records',
    statement: `SELECT * FROM (VALUES ${rows.map(row => `('${row.name}', '${row.source}', ${row.events})`).join(',\n  ')}) AS sample_workspaces(workspace, source, events)`,
    queryId: 'sample-records',
  },
];
const views = galleryCategories.map(category => category.id);

const narrativeRows = bindDataset({
  name: 'Activity for this selection',
  select: (data: { count: number }, input: { region: string }) => [
    { count: data.count, region: input.region },
  ],
  rowKey: row => row.region,
  columns: {
    count: { value: row => row.count },
    region: { value: row => row.region },
  },
  evidence: { id: 'text-activity', queryNames: ['gallery-trend'] },
});
const narrative = defineDataContent<{ count: number }, { region: string }>(
  result => (
    <TextWidget
      title="Activity for this selection"
      evidence={{ id: 'text-activity', queryNames: ['gallery-trend'] }}
      reading={narrativeRows.read(result)}
    >
      {([{ count, region }]) => (
        <p>
          {count === 0
            ? `No activity was recorded in ${region}.`
            : `${count} people were active in ${region}.`}{' '}
          Compare feature use below to understand their activity.
        </p>
      )}
    </TextWidget>
  )
);

function TextExamples() {
  const [region, setRegion] = useState('Europe');
  const [shown, setShown] = useState({
    data: { count: 42 },
    input: { region: 'Europe' },
  });
  const [state, setState] = useState<
    'ready' | 'loading' | 'updating' | 'failed'
  >('ready');
  const view = resolveDataView({
    requestedInput: { region },
    current: state === 'ready' ? shown : undefined,
    previous: state === 'loading' ? undefined : shown,
    pending: state === 'loading' || state === 'updating',
    error: state === 'failed' ? new Error('Fixture unavailable') : undefined,
    sameInput: (left, right) => left.region === right.region,
    describe: input => input.region,
    isEmpty: () => false,
  });

  return (
    <section id="text" aria-label="Text widgets">
      <Stack>
        <Stack className="gallery-copy" gap="sm">
          <h2>Text widgets</h2>
          <p>
            TextWidget uses the standard widget frame. TextContent provides the
            same prose typography without a frame.
          </p>
        </Stack>
        <TextContent>
          <p>
            This is a borderless <strong>TextContent</strong> introduction.
            Start with activity, then explore which features people use.
          </p>
        </TextContent>
        <TextWidget
          title="How to read this exploration"
          description="Static narrative with the standard widget frame"
        >
          <p>
            Use the charts to compare <strong>activity across regions</strong>.
          </p>
          <ul>
            <li>A measured zero means no activity was recorded.</li>
            <li>
              Text explaining results follows the same selection as the charts.
            </li>
          </ul>
          <p>
            <a href="#widgets">Explore the dashboard composition</a> for a
            complete example.
          </p>
        </TextWidget>
        <VariableBar>
          <Combobox
            label="Narrative region"
            options={[
              { id: 'Europe', label: 'Europe' },
              { id: 'Asia', label: 'Asia' },
            ]}
            value={region}
            onChange={value => {
              if (value) {
                setRegion(value);
                setState('updating');
              }
            }}
          />
          <Button onClick={() => setState('loading')}>
            Initial text loading
          </Button>
          <Button onClick={() => setState('updating')}>Refresh text</Button>
          <Button onClick={() => setState('failed')}>Fail text refresh</Button>
          <Button
            onClick={() => {
              setShown({
                data: { count: region === 'Europe' ? 42 : 18 },
                input: { region },
              });
              setState('ready');
            }}
          >
            Resolve text request
          </Button>
          <Button
            onClick={() => {
              setShown({ data: { count: 0 }, input: { region } });
              setState('ready');
            }}
          >
            Show zero activity
          </Button>
        </VariableBar>
        <DataBoundary
          view={view}
          loadingFallback={narrative.loadingFallback}
          emptyFallback={null}
          error={() => (
            <TextContent>
              <p>
                Couldn’t load this selection. Resolve the text request to try
                again.
              </p>
            </TextContent>
          )}
          notice="inline"
        >
          {(data, input) => narrative.children(data, input)}
        </DataBoundary>
      </Stack>
    </section>
  );
}

function QuickControls() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(true);
  return (
    <section id="controls" aria-label="Control states">
      <Stack>
        <Stack className="gallery-copy" gap="sm">
          <h2>Find and filter records</h2>
          <p>
            Search a dataset, include archived records, and choose sources. Open
            the pickers to compare ready, loading, empty, and failed states.
          </p>
        </Stack>
        <VariableBar aria-label="Demo controls">
          <Button>Default button</Button>
          <Button variant="ghost" size="compact">
            Compact ghost action
          </Button>
          <Button disabled>Disabled action</Button>
          <Tooltip content="This describes the action">
            <Button>Hint action</Button>
          </Tooltip>
          <Checkbox
            label="Include archived records"
            description="Checkbox and picker marks share one implementation."
            checked={checked}
            onChange={setChecked}
          />
        </VariableBar>
        <SearchField
          label="Search gallery records"
          value={query}
          onChange={setQuery}
        />
        <VariableBar aria-label="Demo controls">
          <Combobox
            label="Categories"
            options={options}
            values={categories}
            onChange={setCategories}
            maxSelected={2}
            emptySelectionLabel="Choose categories"
            missingOption={{
              id: 'missing',
              label: 'No value',
              description: 'Records without a category value',
            }}
          />
          <Combobox
            label="Loading categories"
            options={loading ? [] : options}
            values={[]}
            onChange={() => {}}
            maxSelected={2}
            emptySelectionLabel="Choose categories"
            loading={loading}
          />
          <Button size="compact" onClick={() => setLoading(false)}>
            Complete loading
          </Button>
          <Combobox
            label="Refreshing categories"
            options={options}
            value="http"
            onChange={() => {}}
            loading
          />
          <Combobox
            label="Failed categories"
            options={options}
            value="http"
            onChange={() => {}}
            error={error}
            onRetry={() => setError(false)}
          />
          <Combobox
            label="Empty categories"
            options={[]}
            values={[]}
            onChange={() => {}}
            maxSelected={2}
            emptySelectionLabel="Choose categories"
          />
          <Combobox
            label="Disabled categories"
            options={options}
            value="http"
            onChange={() => {}}
            disabled
          />
        </VariableBar>
      </Stack>
    </section>
  );
}

function Overview() {
  const [query, setQuery] = useState('');
  return (
    <section id="widgets" aria-label="Product activity dashboard">
      <Stack>
        <DataWidget
          title="Monday accounts for 60% of recorded activity"
          description="20 events across two active workspaces. Tuesday has a measured zero. Select a day to inspect it, or search the workspace records below."
        >
          <VariableBar aria-label="Dashboard context">
            <PeriodSummary
              period={{
                kind: 'calendar',
                start: '2026-09-28',
                end: '2026-09-30',
                timeZone: 'UTC',
              }}
            />
            <HelpPopover
              trigger="Build this pattern"
              triggerLabel="How to compose this dashboard"
              label="Dashboard composition"
            >
              <p>
                Combine MetricWidget for the headline, VisualizationWidget for
                the trend, and TableWidget for the supporting records. Open a
                widget heading to inspect its definition and sample SQL.
              </p>
            </HelpPopover>
          </VariableBar>
        </DataWidget>
        <Grid columns={3} minItemWidth="compact">
          <MetricWidget
            label="Recorded events"
            value={20}
            format={{ kind: 'count' }}
            evidence={evidence}
            insight="12 on Monday · 8 on Wednesday"
          />
          <MetricWidget
            label="Active workspaces"
            value={2}
            format={{ kind: 'count' }}
            evidence={recordsEvidence}
            insight="Of 23 tracked workspaces"
          />
          <MetricWidget
            label="Workspace activation"
            value={2 / 23}
            format={{ kind: 'ratio', maximumFractionDigits: 1 }}
            evidence={recordsEvidence}
            insight="Workspaces with at least one event"
          />
        </Grid>
        <Grid columns={2}>
          <VisualizationWidget
            title="Weekly activity"
            reading={{ loading: false, value: bars }}
            evidence={evidence}
            isEmpty={items => items.length === 0}
            emptyFallback={{ title: 'No activity' }}
            viewLabel="Activity presentation"
            views={[
              {
                id: 'chart',
                label: 'Chart',
                render: items => (
                  <BarChart
                    items={items}
                    unit="events"
                    ariaLabel="Weekly events"
                  />
                ),
              },
              {
                id: 'summary',
                label: 'Summary',
                render: items => (
                  <p>
                    {items.reduce((sum, item) => sum + item.value, 0)} events
                    this week, concentrated on Monday and Wednesday. Tuesday had
                    no recorded activity.
                  </p>
                ),
              },
            ]}
          />
          <TableWidget
            title="Workspace activity"
            rows={rows}
            rowKey={row => row.id}
            columns={[
              { id: 'name', header: 'Workspace', cell: row => row.name },
              { id: 'source', header: 'Source', cell: row => row.source },
              {
                id: 'events',
                header: 'Events',
                type: 'number',
                cell: row => row.events,
              },
            ]}
            search={{
              label: 'Search table records',
              value: query,
              onChange: setQuery,
              attributes: [{ name: 'name', getter: row => row.name }],
            }}
            evidence={recordsEvidence}
            emptyFallback={{ title: 'No matching records' }}
          />
          <DataWidget title="Activity by source" evidence={recordsEvidence}>
            <Breakdown
              total={20}
              items={[
                { id: 'http', label: 'HTTP', value: 12 },
                { id: 'postgres', label: 'Postgres', value: 8 },
                { id: 'other', label: 'Other', value: 0 },
              ]}
            />
          </DataWidget>
          <DataWidget title="Most active workspaces" evidence={recordsEvidence}>
            <Ranking
              items={rows.slice(0, 3).map(row => ({
                id: String(row.id),
                label: row.name,
                value: row.events,
                detail: row.source,
              }))}
            />
          </DataWidget>
        </Grid>
      </Stack>
    </section>
  );
}

function Gallery() {
  const [view, setView] = useViewTab(views, 'overview');

  useEffect(() => {
    const navigation = getDataAppNavigation();
    function followSection() {
      const id = (navigation?.snapshot().hash ?? window.location.hash).slice(1);
      const category =
        id === 'controls'
          ? 'filters'
          : id === 'widgets'
            ? 'overview'
            : gallerySections[id]?.category;
      if (category) {
        writeSearch({ view: category }, 'replace');
        requestAnimationFrame(() =>
          document.getElementById(id)?.scrollIntoView()
        );
      }
    }
    followSection();
    if (navigation) return navigation.subscribe(followSection);
    window.addEventListener('hashchange', followSection);
    return () => window.removeEventListener('hashchange', followSection);
  }, []);

  function selectCategory(key: string | number) {
    const navigation = getDataAppNavigation();
    if (navigation) {
      const location = navigation.snapshot();
      if (location.hash)
        navigation.update({ ...location, hash: '' }, 'replace');
    } else if (window.location.hash) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`
      );
    }
    setView(key);
  }

  return (
    <DataApp
      csvExport={{
        filename: 'gallery',
        tables: [
          {
            name: 'Counts',
            columns: ['Name', 'Count'],
            rows: [
              ['München, "East"', 0],
              ['Two\nlines', null],
            ],
          },
          ...(new URLSearchParams(location.search).has('multiple-exports')
            ? [{ name: 'Summary', columns: ['Total'], rows: [[0]] }]
            : []),
        ],
      }}
      config={config}
      dataContext={dataContext}
      queries={queries}
      description="Explore the patterns behind useful data apps. Start with a working dashboard, then try the controls, displays, and states that fit your use case."
    >
      <Tabs
        data-testid="gallery-tabs"
        selectedKey={view}
        onSelectionChange={selectCategory}
      >
        <TabList aria-label="Gallery categories">
          {galleryCategories.map(category => (
            <Tab key={category.id} id={category.id}>
              {category.label}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {galleryCategories.map(category => (
            <TabPanel key={category.id} id={category.id} shouldForceMount>
              <Stack>
                <Stack className="gallery-copy" gap="sm">
                  <h2>{category.title}</h2>
                  <p>{category.description}</p>
                  <p>
                    <strong>Use for:</strong> {category.uses.join(' · ')}
                  </p>
                </Stack>
                {category.id === 'overview' ? (
                  <Overview />
                ) : category.id === 'widgets' ? (
                  <GalleryBasics />
                ) : (
                  <Stack>
                    {category.id === 'filters' && <QuickControls />}
                    {category.id === 'evidence' && <TextExamples />}
                    <GalleryCases category={category.id} />
                  </Stack>
                )}
              </Stack>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </DataApp>
  );
}

injectDataAppStyles();
mountDataApp({ config, component: Gallery });

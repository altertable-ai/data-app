import { GalleryCases } from '@/browser-tests/fixtures/gallery-cases';
import {
  galleryCategories,
  gallerySections,
} from '@/browser-tests/fixtures/gallery-catalog';
import { useEffect, useState } from 'react';
import { getDataAppNavigation } from '@altertable/data-app/client';
import {
  DataApp,
  AppIcon,
  Breakdown,
  Ranking,
  MetricWidget,
  Button,
  Checkbox,
  Combobox,
  DataWidget,
  Grid,
  SearchField,
  SelectableBarChart,
  Stack,
  TableWidget,
  Tooltip,
  VisualizationWidget,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  useViewTab,
  writeSearch,
  type WidgetEvidence,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';

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
};
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

function QuickControls() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(true);
  return (
    <section id="controls" aria-label="Control states">
      <Stack>
        <header className="gallery-section-heading">
          <span className="gallery-group">Segment investigation</span>
          <h2>Find and filter records</h2>
          <p className="gallery-note">
            Search a dataset, include archived records, and choose sources. Open
            the pickers to compare ready, loading, empty, and failed states.
          </p>
        </header>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
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
        </div>
        <SearchField
          label="Search gallery records"
          value={query}
          onChange={setQuery}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
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
        </div>
      </Stack>
    </section>
  );
}

function Overview() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section id="widgets" aria-label="Product activity dashboard">
      <Stack>
        <div className="gallery-finding">
          <span className="gallery-group">
            Product activity · Sep 28–30, 2026
          </span>
          <h3>Monday accounts for 60% of recorded activity</h3>
          <p>
            20 events across two active workspaces. Tuesday has a measured zero.
            Select a day to inspect it, or search the workspace records below.
          </p>
        </div>
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
            empty={{ title: 'No activity' }}
            viewLabel="Activity presentation"
            views={[
              {
                id: 'chart',
                label: 'Chart',
                render: items => (
                  <SelectableBarChart
                    items={items}
                    selectedId={selected}
                    onSelectionChange={setSelected}
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
            empty={{ title: 'No matching records' }}
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
        <div className="gallery-recipe">
          <AppIcon name="info" size={16} />
          <p>
            <strong>Build this pattern.</strong> Combine MetricWidget for the
            headline, VisualizationWidget for the trend, and TableWidget for the
            supporting records. Open a widget heading to inspect its definition
            and sample SQL.
          </p>
        </div>
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
      config={config}
      dataContext={dataContext}
      queries={queries}
      description="Explore the patterns behind useful data apps. Start with a working dashboard, then try the controls, displays, and states that fit your use case."
      layoutProps={{ className: 'gallery-app' }}
    >
      <Tabs
        className="gallery-tabs"
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
              <header className="gallery-introduction">
                <span className="gallery-group">
                  {category.id === 'overview'
                    ? 'Composed example'
                    : 'Pattern library'}
                </span>
                <h2>{category.title}</h2>
                <p>{category.description}</p>
                <ul
                  className="gallery-use-cases"
                  aria-label="Example use cases"
                >
                  {category.uses.map(use => (
                    <li key={use}>{use}</li>
                  ))}
                </ul>
              </header>
              {category.id === 'overview' ? (
                <Overview />
              ) : (
                <Stack>
                  {category.id === 'filters' && <QuickControls />}
                  <GalleryCases category={category.id} />
                </Stack>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </DataApp>
  );
}

injectDataAppStyles();
mountDataApp({ config, component: Gallery });

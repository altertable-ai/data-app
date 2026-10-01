import { GalleryCases } from '@/browser-tests/fixtures/gallery-cases';
import { useState } from 'react';
import {
  DataApp,
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
  TextWidget,
  TextContent,
  defineDataContent,
  DataBoundary,
  resolveDataView,
  injectDataAppStyles,
  mountDataApp,
} from '@altertable/data-app/react';

const options = [
  { id: 'http', label: 'HTTP' },
  { id: 'postgres', label: 'Postgres' },
  { id: 'other', label: 'Other' },
];
const evidence = {
  id: 'gallery-trend',
  queryNames: ['gallery-trend'] as [string],
};
const bars = [
  { id: 'monday', label: 'Monday', value: 12 },
  { id: 'tuesday', label: 'Tuesday', value: 0 },
  { id: 'wednesday', label: 'Wednesday', value: 8 },
];
const rows = Array.from({ length: 23 }, (_, index) => ({
  id: index,
  name:
    index === 0
      ? 'A long record name that wraps in narrow containers'
      : `Record ${index + 1}`,
}));

const config = {
  title: 'Runtime component gallery',
  scope: { organization: 'Fixtures', environment: 'development' },
  appearance: { theme: 'light' },
};
const dataContext = {
  glossary: {},
  description: 'Static runtime component fixtures.',
};

const narrative = defineDataContent<{ count: number }, { region: string }>(
  result => (
    <TextWidget
      title="Activity for this selection"
      evidence={{ id: 'text-activity', queryNames: ['gallery-trend'] }}
      reading={result.select((data, input) => ({
        count: data.count,
        region: input.region,
      }))}
    >
      {({ count, region }) => (
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
        <h2>Text widgets</h2>
        <p className="gallery-caption">
          TextWidget uses the standard widget frame. TextContent provides the
          same prose typography without a frame.
        </p>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
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
        </div>
        <DataBoundary
          view={view}
          loading={narrative.loading}
          empty={null}
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

function Gallery() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <DataApp
      config={config}
      dataContext={dataContext}
      description="Components in their app context. Gray captions describe each case; only the rendered component owns a surface. Use the index to compare states and the footer to switch themes."
    >
      <Stack>
        <nav className="gallery-navigation" aria-label="Gallery sections">
          {[
            {
              label: 'Overview',
              links: [
                ['controls', 'Quick controls'],
                ['widgets', 'Dashboard composition'],
              ],
            },
            {
              label: 'Controls',
              links: [
                ['buttons', 'Actions & search'],
                ['picker-edges', 'Filters'],
                ['dates', 'Dates & freshness'],
              ],
            },
            {
              label: 'Data display',
              links: [
                ['text', 'Text widgets'],
                ['metrics', 'Metrics'],
                ['tables', 'Tables'],
                ['charts', 'Charts & collections'],
              ],
            },
            {
              label: 'Request states',
              links: [
                ['refresh', 'Refresh'],
                ['requests', 'Boundaries'],
                ['empty-loading', 'Empty & loading'],
              ],
            },
            {
              label: 'App structure',
              links: [
                ['overlays', 'Inspection & help'],
                ['chrome', 'Page chrome'],
                ['layout', 'Layout'],
                ['icons', 'Semantic icons'],
              ],
            },
          ].map(({ label, links }) => (
            <div className="gallery-navigation-group" key={label}>
              <span>{label}</span>
              <div className="gallery-navigation-links">
                {links.map(([id, text]) => (
                  <a key={id} href={`#${id}`}>
                    {text}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <section id="controls" aria-label="Control states">
          <Stack>
            <h2>Quick controls</h2>
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
        <TextExamples />
        <section id="widgets" aria-label="Widget states">
          <Stack>
            <h2>Dashboard composition</h2>
            <TextWidget title="Explore weekly activity">
              <p>
                Start with <strong>daily activity</strong>, then compare the
                records behind each day.
              </p>
              <ul>
                <li>A measured zero means there was no activity that day.</li>
                <li>Use the widget headings to inspect their evidence.</li>
              </ul>
              <p>
                <a href="#charts">Explore the charts and collections</a> for
                more detail.
              </p>
            </TextWidget>
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
                        {items.reduce((sum, item) => sum + item.value, 0)}{' '}
                        events this week, concentrated on Monday and Wednesday.
                        Tuesday had no recorded activity.
                      </p>
                    ),
                  },
                ]}
              />
              <TableWidget
                title="Gallery records"
                rows={rows}
                rowKey={row => row.id}
                columns={[
                  { id: 'name', header: 'Record', cell: row => row.name },
                ]}
                search={{
                  label: 'Search table records',
                  value: query,
                  onChange: setQuery,
                  attributes: [{ name: 'name', getter: row => row.name }],
                }}
                evidence={{
                  id: 'gallery-records',
                  queryNames: ['gallery-records'],
                }}
                empty={{ title: 'No matching records' }}
              />
              <DataWidget
                title="Loading widget"
                reading={{ loading: true }}
                evidence={evidence}
                isEmpty={() => false}
                empty={{ title: 'No activity' }}
              >
                {() => null}
              </DataWidget>
              <DataWidget
                title="Empty widget"
                empty={{
                  title: 'No activity yet',
                  description: 'Choose another period.',
                }}
              >
                {null}
              </DataWidget>
              <DataWidget
                title="Updating widget"
                status={{ kind: 'updating', message: 'Refreshing activity' }}
              >
                <p>The displayed result remains visible.</p>
              </DataWidget>
              <DataWidget
                title="Failed refresh"
                status={{
                  kind: 'error',
                  message: 'Couldn’t refresh activity',
                  onRetry: () => {},
                }}
              >
                <p>The last successful result remains visible.</p>
              </DataWidget>
            </Grid>
          </Stack>
        </section>
        <GalleryCases />
      </Stack>
    </DataApp>
  );
}

injectDataAppStyles();

mountDataApp({ config, component: Gallery });

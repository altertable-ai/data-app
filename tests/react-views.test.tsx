import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  defineDateRangeContract,
  defineOperation,
  defineQueryNames,
  type DataOperation,
  type DateRangeRequest,
  dimensionFilter,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';
import {
  createDataHooks,
  DataWidget,
  displayedSnapshot,
  dateRangeVariable,
  textVariable,
  createDataContext,
  ComparisonVisual,
  MetricWidget,
  VisualizationWidget,
  TableWidget,
  WidgetViewTabs,
  PresentStory,
  DataApp,
  DataSection,
  type DataView,
  type DataReading,
} from '@altertable/data-app/react';

import { storySteps } from '@/src/react/ui/story';
import { resolveViewInput } from '@/src/react/view';

const names = defineQueryNames({ activity: 'activity' });
const context = createDataContext(names)({
  description: 'Activity',
  glossary: {
    actions: {
      term: 'Actions',
      definition: 'Recorded actions',
      queryNames: [names.activity],
    },
  },
});
const actions = context.metric({
  id: 'actions',
  glossaryId: 'actions',
  format: { kind: 'count' },
});
const featureEvidence = context.evidence({
  id: 'features',
  queryNames: [names.activity],
});
const calendar = defineDateRangeContract({
  timeZone: 'UTC',
  maxRangeDays: 31,
  minDate: '2026-01-01',
  maxDate: '2026-03-31',
});
const period = dateRangeVariable({
  key: 'period',
  contract: calendar,
  comparison: true,
  defaultValue: { kind: 'preset', id: 'last-7' },
});
type Data = { current: number; previous: number | null; rows: string[] };
const { defineDataView, defineTimeView } = createDataHooks<{
  activity: DataOperation<DateRangeRequest, Data>;
}>(createDataClient());
const view = defineDataView({
  operation: 'activity',
  variables: { period },
  input({ period }) {
    return period;
  },
  date: {
    variable: 'period',
    input(input) {
      return input;
    },
  },
  isEmpty(data) {
    return data.rows.length === 0;
  },
  empty: { title: 'No actions' },
});

test('an explicit null loading layout does not restore the generic panel', () => {
  const html = renderToStaticMarkup(
    <DataSection
      result={{ view: { kind: 'loading' }, refetch() {} }}
      empty={{ title: 'No results' }}
      loading={null}
    >
      {() => <p>Ready</p>}
    </DataSection>
  );
  expect(html).not.toContain('altertable-content-skeleton');
  expect(html).not.toContain('Ready');
});

test('inline app content runs for pending or displayed results and inherits comparison dates', () => {
  const frame = { location: new URL('https://app.example.com') };
  Object.assign(frame, { top: frame });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: frame,
  });
  let renders = 0;
  let selectors = 0;
  const input = calendar.request(
    { start: '2026-03-10', end: '2026-03-12' },
    true
  );
  const data = { current: 12, previous: 10, rows: ['Insights'] };
  function render(state: DataView<Data, DateRangeRequest>) {
    return renderToStaticMarkup(
      <DataApp
        config={{
          title: 'Activity',
          scope: { organization: 'a', environment: 'b' },
          appearance: {},
        }}
        dataContext={context}
        request={{
          view: state,
          refetch() {},
          empty: { title: 'No actions' },
          date: value => value,
        }}
        story={() => []}
        csvExport={({ data }) => ({
          filename: 'actions',
          tables: [
            { name: 'Actions', columns: ['Count'], rows: [[data.current]] },
          ],
        })}
      >
        {result => {
          renders++;
          const scope = result.select((_, input) => {
            selectors++;
            return input.range.start;
          });
          return (
            <>
              <h2>Activity overview</h2>
              <p>{scope.loading ? 'Pending scope' : scope.value}</p>
              <MetricWidget
                metric={actions}
                reading={result.metric(data => ({
                  current: data.current,
                  previous: data.previous,
                }))}
              />
            </>
          );
        }}
      </DataApp>
    );
  }
  try {
    const pending = render({ kind: 'loading' });
    expect(pending).toContain('Activity overview');
    expect(pending).toContain('Pending scope');
    expect(selectors).toBe(0);
    expect(renders).toBe(1);
    const ready = render({ kind: 'ready', data, input });
    expect(ready).toContain('20.0%');
    expect(ready).toContain(input.range.start);
    expect(selectors).toBe(1);
    expect(renders).toBe(2);
    for (const kind of ['updating', 'stale-error'] as const) {
      const html = render({
        kind,
        data,
        displayedInput: input,
        requestedInput: calendar.request(
          { start: '2026-03-13', end: '2026-03-15' },
          true
        ),
        error: new Error('Unavailable'),
        message: 'Showing previous results.',
      });
      expect(html).toContain(input.range.start);
      expect(html).toContain('20.0%');
      expect(html).not.toContain('Pending scope');
    }
    expect(renders).toBe(4);
    const reusable = view.content(result => (
      <MetricWidget
        metric={actions}
        reading={result.metric(data => ({
          current: data.current,
          previous: data.previous,
        }))}
      />
    ));
    function renderCustom(
      state: DataView<Data, DateRangeRequest>,
      loading = reusable.loading
    ) {
      return renderToStaticMarkup(
        <DataApp
          config={{
            title: 'Activity',
            scope: { organization: 'a', environment: 'b' },
            appearance: {},
          }}
          dataContext={context}
          request={{
            view: state,
            refetch() {},
            empty: { title: 'No actions' },
          }}
          story={() => []}
          csvExport={({ data }) => ({
            filename: 'actions',
            tables: [
              { name: 'Actions', columns: ['Count'], rows: [[data.current]] },
            ],
          })}
          {...reusable}
          loading={loading}
        />
      );
    }
    expect(renderCustom({ kind: 'loading' })).toContain(
      'altertable-content-skeleton'
    );
    expect(renderCustom({ kind: 'loading' }, null)).not.toContain(
      'altertable-content-skeleton'
    );
    expect(renderCustom({ kind: 'ready', data, input })).toContain('20.0%');
    expect(render({ kind: 'empty', input })).toContain('No actions');
    expect(
      render({ kind: 'error', error: new Error('Unavailable') })
    ).toContain('Couldn’t load results');
    expect(renders).toBe(4);
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('widget insights accept readings, preserve zero, and omit absent findings', () => {
  function render(insight: DataReading<string | number | null | undefined>) {
    return renderToStaticMarkup(
      <>
        <MetricWidget
          label="Actions"
          value={0}
          format={{ kind: 'count' }}
          insight={insight}
        />
        <VisualizationWidget
          title="Features"
          visual={<p>Chart</p>}
          insight={insight}
        />
        <TableWidget
          title="Sources"
          rows={['Web']}
          rowKey={row => row}
          columns={[{ id: 'source', header: 'Source', cell: row => row }]}
          empty={{ title: 'No sources' }}
          insight={insight}
        />
      </>
    );
  }
  const pending = render({ loading: true });
  expect(pending.match(/altertable-content-skeleton-foot/g)).toHaveLength(3);
  const ready = render({ loading: false, value: 'A displayed finding' });
  expect(ready.match(/A displayed finding/g)).toHaveLength(3);
  expect(ready).not.toContain('altertable-content-skeleton-foot');
  const zero = render({ loading: false, value: 0 });
  expect(zero).toContain('altertable-metric-insight">0</div>');
  expect(zero.match(/altertable-data-widget-footer/g)).toHaveLength(2);
  for (const value of [null, undefined]) {
    const absent = render({ loading: false, value });
    expect(absent).not.toContain('altertable-data-widget-footer');
    expect(absent).not.toContain('altertable-metric-insight');
  }
});

test('a custom data widget shares the bound loading, empty, and inspection contract', () => {
  let rendered = 0;

  function widget(
    reading: { loading: true } | { loading: false; value: number[] }
  ) {
    return renderToStaticMarkup(
      <DataWidget
        title="Sessions by source"
        evidence={featureEvidence}
        reading={reading}
        isEmpty={values => values.length === 0}
        empty={{ title: 'No sessions' }}
      >
        {values => {
          rendered++;

          return (
            <ol>
              {values.map(value => (
                <li key={value}>{value}</li>
              ))}
            </ol>
          );
        }}
      </DataWidget>
    );
  }
  const loading = widget({ loading: true });
  expect(loading).toContain('altertable-content-skeleton-body');
  expect(loading).toContain('Sessions by source');
  expect(loading).toContain('aria-busy="true"');
  expect(loading).not.toContain('Explore Sessions by source');
  expect(rendered).toBe(0);
  expect(widget({ loading: false, value: [] })).toContain('No sessions');
  expect(rendered).toBe(0);
  const ready = widget({ loading: false, value: [7] });
  expect(ready).toContain('<li>7</li>');
  expect(ready).toContain('Sessions by source');
  expect(ready).toContain('aria-label="Explore Sessions by source"');
  expect(rendered).toBe(1);
});

test('time view derives its control, input, and displayed period from one declaration', () => {
  const timed = defineTimeView({
    operation: 'activity',
    time: {
      contract: calendar,
      defaultValue: { kind: 'preset', id: 'last-7' },
    },
    isEmpty(data) {
      return !data.rows.length;
    },
    empty: { title: 'No actions' },
  });
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(timed.variables.period.kind).toBe('dateRange');
  expect(resolveViewInput(timed, { period: input })).toEqual(input);
  expect(timed.describeInput(input)).toContain('Mar 10–12, 2026');
});

test('time view composes other inputs without surrendering its period binding', () => {
  const { defineTimeView: defineSearchView } = createDataHooks<{
    search: DataOperation<{ period: DateRangeRequest; search: string }, Data>;
  }>(createDataClient());
  const search = textVariable({ key: 'search' });
  const timed = defineSearchView({
    operation: 'search',
    time: {
      contract: calendar,
      defaultValue: { kind: 'preset', id: 'last-7' },
    },
    variables: { search },
    input({ period, search }) {
      return { period, search };
    },
    isEmpty(data) {
      return !data.rows.length;
    },
    empty: { title: 'No actions' },
  });
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(resolveViewInput(timed, { period: input, search: 'billing' })).toEqual(
    {
      period: input,
      search: 'billing',
    }
  );
});

test('Present findings use the displayed input and require unique, supported evidence', () => {
  const data = { current: 12, previous: null, rows: ['a'] };
  const view = {
    kind: 'stale-error' as const,
    data,
    displayedInput: 'old',
    requestedInput: 'new',
    error: new Error('offline'),
    message: 'stale',
  };
  expect(displayedSnapshot(view)).toEqual({
    data,
    input: 'old',
    state: 'stale-error',
  });
  const finding = {
    id: 'concentration',
    headline: 'Most activity occurred on one day',
    visual: '12 actions',
    evidence: featureEvidence,
  };
  expect(storySteps([finding], context)[0]?.queryNames).toEqual(['activity']);
  expect(() => storySteps([finding, finding], context)).toThrow('unique');
  expect(() =>
    storySteps(
      [{ ...finding, evidence: { id: 'missing', queryNames: ['unknown'] } }],
      context
    )
  ).toThrow('Unknown query');
});

test('nested view inputs preserve dates and dimensions in validation and descriptions', () => {
  const source = dimensionFilter<string>({
    key: 'source',
    label: 'Source',
    valueType: 'string',
    selection: 'multiple',
    options: [{ value: 'HTTP', label: 'HTTP' }],
  });
  type Input = {
    request: DateRangeRequest;
    filters: { source: DimensionSelection<string> };
  };
  const { defineTimeView } = createDataHooks<{
    nested: DataOperation<Input, Data>;
  }>(createDataClient());
  const timed = defineTimeView({
    operation: 'nested',
    time: {
      contract: calendar,
      defaultValue: { kind: 'preset', id: 'last-7' },
    },
    variables: { source },
    input({ period, source }) {
      return { request: period, filters: { source } };
    },
    bindings: {
      period(input) {
        return input.request;
      },
      source(input) {
        return input.filters.source;
      },
    },
    isEmpty(data) {
      return !data.rows.length;
    },
    empty: { title: 'No actions' },
  });
  const period = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  const selected: DimensionSelection<string> = {
    kind: 'include',
    members: [{ kind: 'value', value: 'HTTP' }],
  };
  const input = resolveViewInput(timed, { period, source: selected });
  expect(input).toEqual({ request: period, filters: { source: selected } });
  expect(timed.describeInput(input)).toContain('Mar 10–12, 2026');
  expect(timed.describeInput(input)).toContain('Source: HTTP');
  expect(() =>
    resolveViewInput({ ...timed, bindings: {} }, { period, source: selected })
  ).toThrow('source dimension selection');
  expect(() =>
    resolveViewInput(
      {
        ...timed,
        input() {
          return {
            request: period,
            filters: { source: { kind: 'all' as const } },
          };
        },
      },
      { period, source: selected }
    )
  ).toThrow('source dimension selection');
  expect(() =>
    resolveViewInput(
      {
        ...timed,
        date: {
          variable: 'period',
          input(input) {
            return (input as unknown as { period: DateRangeRequest }).period;
          },
        },
      },
      { period, source: selected }
    )
  ).toThrow('selected date range');
});

test('story inspection inherits executed SQL and filters it to the finding evidence', () => {
  const frame = { location: new URL('https://app.example.com') };
  Object.assign(frame, { top: frame });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: frame,
  });
  try {
    const html = renderToStaticMarkup(
      <DataApp
        config={{
          title: 'Activity',
          scope: { organization: 'Acme', environment: 'production' },
          appearance: {},
        }}
        dataContext={context}
        queries={[
          { name: 'activity', statement: 'SELECT 42 AS story_evidence' },
          { name: 'unrelated', statement: 'SELECT 99 AS unrelated_evidence' },
        ]}
      >
        <PresentStory
          title="Activity"
          dataContext={context}
          findings={[
            {
              id: 'concentration',
              headline: 'Most activity occurred on one day',
              visual: '42 actions',
              evidence: featureEvidence,
            },
          ]}
        />
      </DataApp>
    );
    expect(html).toContain('story_evidence');
    expect(html).not.toContain('unrelated_evidence');
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('bound metrics share values, formatting, evidence and displayed comparison periods', () => {
  expect(actions.evidence).toEqual({
    id: 'actions',
    glossaryIds: ['actions'],
    queryNames: ['activity'],
  });
  const content = view.content(result => {
    const reading = result.metric(data => ({
      current: data.current,
      previous: data.previous,
    }));

    return <ComparisonVisual metric={actions} reading={reading} />;
  });
  const input = calendar.request(
    { start: '2026-03-10', end: '2026-03-12' },
    true
  );
  const html = renderToStaticMarkup(
    content.children({ current: 120, previous: 100, rows: ['a'] }, input)
  );
  expect(html).toContain('120');
  expect(html).toContain('20.0%');
  expect(html).toContain('Mar 10–12, 2026');
  expect(html).toContain('Mar 7–9, 2026');
  expect(
    renderToStaticMarkup(
      content.children({ current: 0, previous: null, rows: [] }, input)
    )
  ).toContain('No comparable previous value');
  expect(
    renderToStaticMarkup(
      content.children({ current: 120, previous: 0, rows: [] }, input)
    )
  ).not.toContain('Infinity');
});

test('favorable direction colors a comparison without changing its numeric direction', () => {
  const fewerIsBetter = context.metric({
    id: 'errors',
    glossaryId: 'actions',
    format: { kind: 'count' },
    favorableDirection: 'down',
  });
  const content = view.content(result => (
    <ComparisonVisual
      metric={fewerIsBetter}
      reading={result.metric(data => ({
        current: data.current,
        previous: data.previous,
      }))}
    />
  ));
  const input = calendar.request(
    { start: '2026-03-10', end: '2026-03-12' },
    true
  );
  const html = renderToStaticMarkup(
    content.children({ current: 120, previous: 100, rows: ['a'] }, input)
  );
  expect(html).toContain('data-tone="bad"');
  expect(html).toContain('20.0%');
});

test('bound visual selectors do not run during loading or render an empty result', () => {
  let calls = 0;
  const content = view.content(result => (
    <VisualizationWidget
      title="Features"
      evidence={featureEvidence}
      reading={result.select(data => {
        calls++;

        return data.rows;
      })}
      isEmpty={rows => rows.length === 0}
      empty={{ title: 'No features' }}
      skeleton={{ variant: 'ranking', rows: 6 }}
    >
      {rows => <p>{rows.join(', ')}</p>}
    </VisualizationWidget>
  ));
  expect(calls).toBe(0);
  expect(
    renderToStaticMarkup(content.loading).match(
      /class="altertable-content-skeleton-row"/g
    )
  ).toHaveLength(6);
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(
    renderToStaticMarkup(
      content.children({ current: 0, previous: null, rows: [] }, input)
    )
  ).toContain('No features');
  expect(calls).toBe(1);
});

test('loading widgets keep their authored titles and labels in place', () => {
  const content = view.content(result => (
    <>
      <MetricWidget
        metric={actions}
        description="Pooled, completed cohorts"
        insight="Calculated cohort trend"
        style={{ minHeight: 160 }}
        reading={result.metric(data => ({
          current: data.current,
          previous: data.previous,
        }))}
      />
      <VisualizationWidget
        title="Weekly signups"
        description="New accounts per week"
        evidence={featureEvidence}
        reading={result.select(data => data.rows)}
        isEmpty={rows => rows.length === 0}
        empty={{ title: 'No signups' }}
        insight="Derived from the displayed weeks"
      >
        {rows => <p>{rows.join(', ')}</p>}
      </VisualizationWidget>
    </>
  ));
  const loading = renderToStaticMarkup(content.loading);
  expect(loading).toContain('Actions');
  expect(loading).toContain('Pooled, completed cohorts');
  expect(loading).toContain('Weekly signups');
  expect(loading).toContain('New accounts per week');
  expect(loading).not.toContain('Derived from the displayed weeks');
  expect(loading).not.toContain('Calculated cohort trend');
  expect(loading).toContain('altertable-data-widget-footer');
  expect(loading).toContain('altertable-metric-insight');
  expect(loading).toContain('min-height:160px');
  expect(loading).not.toContain('No signups');
  expect(loading).not.toContain('Explore');
  expect(loading.match(/aria-busy="true"/g)).toHaveLength(2);
});

test('date bindings reject silently changed ranges and comparisons', () => {
  const selection = calendar.request(
    { start: '2026-03-10', end: '2026-03-12' },
    true
  );
  expect(resolveViewInput(view, { period: selection })).toEqual(selection);
  expect(() =>
    resolveViewInput(
      {
        ...view,
        input({ period }) {
          return { ...period, comparison: null };
        },
      },
      { period: selection }
    )
  ).toThrow('preserve');
});

test('operation query runner supplies registered identity, policy limit and cancellation', async () => {
  const operation = defineOperation({
    input() {
      return {};
    },
    output() {
      return true;
    },
    checks: [{}],
    queryNames: names,
    policy: { maxQueryRows: 12, maxDurationMs: 1000 },
    async run({ query }) {
      await query(names.activity, 'SELECT 1');

      return true;
    },
  });
  const signal = new AbortController().signal;
  let captured: unknown;
  await operation.run(
    {
      signal,
      lakehouse: {
        async queryAll(statement, options) {
          captured = { statement, ...options };

          return { columns: [], rows: [] };
        },
      },
    },
    {}
  );
  expect(captured).toEqual({
    statement: 'SELECT 1',
    name: 'activity',
    limit: 12,
    signal,
  });
});

test('widget tabs reject duplicate and unknown IDs instead of producing a blank panel', () => {
  const tab = {
    id: 'actions',
    label: 'Actions',
    content: 'Ready',
    isEmpty: false,
    empty: { title: 'Empty' },
  };
  expect(() =>
    renderToStaticMarkup(
      <WidgetViewTabs
        label="Views"
        views={[tab, tab]}
        selectedKey="actions"
        onSelectionChange={() => {}}
      />
    )
  ).toThrow('unique');
  expect(() =>
    renderToStaticMarkup(
      <WidgetViewTabs
        label="Views"
        views={[tab]}
        selectedKey="missing"
        onSelectionChange={() => {}}
      />
    )
  ).toThrow('Unknown widget tab');
});

test('bound visualization views render inside one widget with a selected view', () => {
  const html = renderToStaticMarkup(
    <VisualizationWidget
      title="Feature use"
      evidence={featureEvidence}
      reading={{ loading: false, value: [{ name: 'Insights', count: 4 }] }}
      isEmpty={rows => rows.length === 0}
      empty={{ title: 'No feature use' }}
      viewLabel="Measure"
      views={[
        {
          id: 'actions',
          label: 'Actions',
          render(rows) {
            return <span>{rows[0]?.count} actions</span>;
          },
        },
        {
          id: 'reach',
          label: 'Reach',
          render(rows) {
            return <span>{rows[0]?.name}</span>;
          },
        },
      ]}
    />
  );
  expect(html).toContain('Feature use');
  expect(html).toContain('Actions');
  expect(html).toContain('Reach');
  expect(html).toContain('4 actions');
});

test('bound tables keep their row contract while loading', () => {
  const content = view.content(result => (
    <TableWidget
      title="Features"
      evidence={featureEvidence}
      reading={result.select(data => data.rows)}
      rowKey={row => row}
      columns={[
        {
          id: 'feature',
          header: 'Feature',
          cell(row) {
            return row;
          },
        },
      ]}
      empty={{ title: 'No features' }}
      skeletonRows={3}
      insight="Most used feature"
    />
  ));
  const loading = renderToStaticMarkup(content.loading);
  expect(loading.match(/class="altertable-table-skeleton-row"/g)).toHaveLength(
    3
  );
  expect(loading).toContain('Features');
  expect(loading).toContain('<th scope="col">Feature</th>');
  expect(loading).toContain('altertable-data-widget-footer');
  expect(loading).not.toContain('Most used feature');
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(
    renderToStaticMarkup(
      content.children(
        { current: 1, previous: null, rows: ['Insights'] },
        input
      )
    )
  ).toContain('Insights');
  expect(
    renderToStaticMarkup(
      content.children({ current: 0, previous: null, rows: [] }, input)
    )
  ).toContain('No features');
});

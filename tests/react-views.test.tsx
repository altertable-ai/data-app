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
  Comparison,
  LineChart,
  AreaChart,
  PieChart,
  ScatterChart,
  VisualizationWidget,
  TableWidget,
  WidgetViewTabs,
  PresentStory,
  DataApp,
  DataSection,
  type DataView,
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
  expect(widget({ loading: true })).toContain('altertable-content-skeleton');
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

    return <Comparison metric={actions} reading={reading} />;
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
    <Comparison
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
    renderToStaticMarkup(content.loadingFallback).match(
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
    />
  ));
  expect(
    renderToStaticMarkup(content.loadingFallback).match(
      /class="altertable-skeleton"/g
    )
  ).toHaveLength(3);
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

test('DataApp keeps its children visible while local boundaries own request states', () => {
  const frame = { location: new URL('https://app.example.com') };
  Object.assign(frame, { top: frame });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: frame,
  });
  let renders = 0;
  function render(state: DataView<number, string>) {
    return renderToStaticMarkup(
      <DataApp
        config={{
          title: 'Activity',
          scope: { organization: 'a', environment: 'b' },
          appearance: {},
        }}
        dataContext={context}
        request={{ view: state, refetch() {} }}
        story={() => []}
        csvExport={({ data }) => ({
          filename: 'activity',
          tables: [{ name: 'Activity', columns: ['Count'], rows: [[data]] }],
        })}
      >
        <h2>Always visible introduction</h2>
        <DataSection
          result={{ view: state, refetch() {} }}
          emptyFallback={{ title: 'No activity' }}
          loadingFallback={<p>Loading this section</p>}
          notice="none"
        >
          {(count, input) => {
            renders++;
            return (
              <p>
                {count} actions: {input}
              </p>
            );
          }}
        </DataSection>
      </DataApp>
    );
  }
  try {
    const pending = render({ kind: 'loading' });
    expect(pending).toContain('Always visible introduction');
    expect(pending).toContain('Loading this section');
    expect(renders).toBe(0);
    const failed = render({ kind: 'error', error: new Error('Unavailable') });
    expect(failed).toContain('Always visible introduction');
    expect(failed).toContain('Couldn’t load results');
    const empty = render({ kind: 'empty', input: 'March' });
    expect(empty).toContain('Always visible introduction');
    expect(empty).toContain('No activity');
    expect(renders).toBe(0);
    for (const kind of ['ready', 'updating', 'stale-error'] as const) {
      const state =
        kind === 'ready'
          ? { kind, data: 0, input: 'March' }
          : {
              kind,
              data: 0,
              displayedInput: 'March',
              requestedInput: 'April',
              message: 'Showing March',
              error: new Error('Unavailable'),
            };
      const html = render(state);
      expect(html).toContain('Always visible introduction');
      expect(html).toContain('0 actions: March');
      expect(html).not.toContain('Loading this section');
    }
    expect(renders).toBe(3);
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('visualization controls and insight share the footer without dropping insight when controls are absent', () => {
  for (const footer of [false, <button key="next">Next page</button>]) {
    const html = renderToStaticMarkup(
      <VisualizationWidget
        title="Revenue"
        visual={<p>120 sales</p>}
        footer={footer}
        insight="Revenue increased."
      />
    );
    expect(html).toContain('120 sales');
    expect(html).toContain('Revenue increased.');
    if (footer) {
      expect(html.indexOf('Next page')).toBeLessThan(
        html.indexOf('Revenue increased.')
      );
    }
  }
});

test('line and area charts support empty, single, signed, zero and extreme samples', () => {
  for (const Chart of [LineChart, AreaChart]) {
    for (const values of [
      [],
      [0],
      [12],
      [-4, 0, 8],
      [0, 0, 0],
      [-Number.MAX_VALUE, Number.MAX_VALUE],
    ]) {
      const html = renderToStaticMarkup(
        <Chart
          items={values.map((value, index) => ({
            id: String(index),
            label: `Day ${index}`,
            value,
          }))}
          unit="events"
          ariaLabel="Activity trend"
          formatValue={value => `${value} formatted`}
        />
      );
      expect(html).not.toMatch(/NaN|Infinity/);
      if (!values.length) {
        expect(html).toContain('No data');
        expect(html).not.toContain('<svg');
      } else {
        expect(html.match(/type="button"/g)).toHaveLength(values.length);
        expect(html).toContain('formatted events');
      }
    }
    expect(() =>
      renderToStaticMarkup(
        <Chart
          items={[{ id: 'bad', label: 'Invalid', value: NaN }]}
          unit="events"
          ariaLabel="Invalid chart"
        />
      )
    ).toThrow('finite values');
  }
});

test('pie charts preserve zero categories and handle empty, whole and extreme shares', () => {
  for (const values of [
    [],
    [10],
    [0, 0],
    [10, 0, 30],
    [Number.MAX_VALUE, Number.MAX_VALUE],
  ]) {
    const html = renderToStaticMarkup(
      <PieChart
        items={values.map((value, index) => ({
          id: String(index),
          label: `Part ${index}`,
          value,
        }))}
        unit="orders"
        ariaLabel="Order mix"
      />
    );
    expect(html).not.toMatch(/NaN|Infinity/);
    if (!values.length) expect(html).toContain('No data');
    else {
      expect(html.match(/type="button"/g)).toHaveLength(values.length);
      if (values.every(value => value === 0))
        expect(html).toContain('No nonzero values');
      else
        expect(html.match(/class="altertable-pie-slice"/g)).toHaveLength(
          values.filter(value => value > 0).length
        );
    }
    if (values.length === 1) expect(html).toContain('100%');
  }
  for (const values of [[-1], [NaN], [Infinity]]) {
    expect(() =>
      renderToStaticMarkup(
        <PieChart
          items={values.map((value, index) => ({
            id: String(index),
            label: 'Invalid',
            value,
          }))}
          unit="orders"
          ariaLabel="Invalid mix"
        />
      )
    ).toThrow(
      Number.isFinite(values[0]) ? 'nonnegative values' : 'finite values'
    );
  }
});

test('scatter charts position numeric samples and support empty, constant and signed domains', () => {
  for (const values of [
    [],
    [0],
    [5, 5],
    [-10, 0, 20],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
  ]) {
    const html = renderToStaticMarkup(
      <ScatterChart
        items={values.map((value, index) => ({
          id: String(index),
          label: `Point ${index}`,
          x: value,
          y: value,
        }))}
        xLabel="Volume"
        yLabel="Latency"
        xUnit="requests"
        yUnit="ms"
        ariaLabel="Performance"
      />
    );
    expect(html).not.toMatch(/NaN|Infinity/);
    if (!values.length) expect(html).toContain('No data');
    else expect(html.match(/type="button"/g)).toHaveLength(values.length);
    if (values.length === 3) {
      expect(html).toContain('left:0%;bottom:0%');
      expect(html).toContain(
        'left:33.33333333333333%;bottom:33.33333333333333%'
      );
      expect(html).toContain('left:100%;bottom:100%');
    }
  }
});

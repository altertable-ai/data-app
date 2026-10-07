import { sectionContent } from '@/src/react/content';
import {
  VisualizationWidget as BoundVisual,
  TableWidget as BoundTable,
} from '@/src/react/widgets';
import { createDataHooks } from '@/src/react/hooks';
import { getViewDefinition } from '@/src/react/view-runtime';
import { InspectionSheet } from '@/src/react/ui/AboutData';
import { displayedSnapshot } from '@/src/core/data-view';
import { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';
import { expect, test } from 'bun:test';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { DataAppProvider } from '@/src/react/mount';
import {
  defineDateRangeContract,
  defineOperation,
  defineQueryNames,
  type DataOperation,
  type DateRangeRequest,
  dimensionFilter,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import { createDataClient } from '@/src/client/data-client';
import {
  dateRangeVariable,
  textVariable,
  createDataContext,
  Comparison,
} from '@altertable/data-app/react';
import { DataWidget, VisualizationWidget } from '@/src/react/ui/index';
import { DataAppFrame as DataApp } from '@/src/react/ui/DataAppFrame';
import { DataSectionBoundary as DataSection } from '@/src/react/ui/DataSectionBoundary';
import { type DataView } from '@/src/core/data-view';

import { storySteps } from '@/src/react/ui/story';
import { resolveViewInput } from '@/src/react/view';

function renderToStaticMarkup(content: ReactNode) {
  return renderMarkup(<DataAppProvider>{content}</DataAppProvider>);
}

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
  dataContext: context,
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
  emptyFallback: { title: 'No actions' },
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
        emptyFallback={{ title: 'No sessions' }}
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
    dataContext: context,
    operation: 'activity',
    time: {
      contract: calendar,
      defaultValue: { kind: 'preset', id: 'last-7' },
    },
    isEmpty(data) {
      return !data.rows.length;
    },
    emptyFallback: { title: 'No actions' },
  });
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(getViewDefinition(timed).variables.period.kind).toBe('dateRange');
  expect(resolveViewInput(getViewDefinition(timed), { period: input })).toEqual(
    input
  );
  expect(getViewDefinition(timed).describeInput(input)).toContain(
    'Mar 10–12, 2026'
  );
});

test('time view composes other inputs without surrendering its period binding', () => {
  const { defineTimeView: defineSearchView } = createDataHooks<{
    search: DataOperation<{ period: DateRangeRequest; search: string }, Data>;
  }>(createDataClient());
  const search = textVariable({ key: 'search' });
  const timed = defineSearchView({
    dataContext: context,
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
    emptyFallback: { title: 'No actions' },
  });
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(
    resolveViewInput(getViewDefinition(timed), {
      period: input,
      search: 'billing',
    })
  ).toEqual({
    period: input,
    search: 'billing',
  });
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
    dataContext: context,
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
    emptyFallback: { title: 'No actions' },
  });
  const period = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  const selected: DimensionSelection<string> = {
    kind: 'include',
    members: [{ kind: 'value', value: 'HTTP' }],
  };
  const input = resolveViewInput(getViewDefinition(timed), {
    period,
    source: selected,
  });
  expect(input).toEqual({ request: period, filters: { source: selected } });
  expect(getViewDefinition(timed).describeInput(input)).toContain(
    'Mar 10–12, 2026'
  );
  expect(getViewDefinition(timed).describeInput(input)).toContain(
    'Source: HTTP'
  );
  expect(() =>
    resolveViewInput(
      Object.assign({}, getViewDefinition(timed), { bindings: {} }),
      {
        period,
        source: selected,
      }
    )
  ).toThrow('source dimension selection');
  expect(() =>
    resolveViewInput(
      {
        variables: getViewDefinition(timed).variables,
        bindings: getViewDefinition(timed).bindings,
        date: getViewDefinition(timed).date,
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
        variables: getViewDefinition(timed).variables,
        bindings: getViewDefinition(timed).bindings,
        input: getViewDefinition(timed).input,
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

test('story inspection filters executed SQL to the finding evidence', () => {
  const html = renderToStaticMarkup(
    <InspectionSheet
      title="Activity"
      dataContext={context}
      references={{ kind: 'ids', ...featureEvidence }}
      queries={[
        { name: 'activity', statement: 'SELECT 42 AS story_evidence' },
        { name: 'unrelated', statement: 'SELECT 99 AS unrelated_evidence' },
      ]}
      open
      tab="queries"
      onTabChange={() => {}}
      onOpenChange={() => {}}
      returnFocus={{ current: null }}
    />
  );
  expect(html).toContain('story_evidence');
  expect(html).not.toContain('unrelated_evidence');
});

const actionValues = view.metric(
  { id: 'actions', glossaryId: 'actions', format: { kind: 'count' } },
  data => ({ current: data.current, previous: data.previous })
);
test('bound metrics share values, formatting, evidence and displayed comparison periods', () => {
  expect(actions.evidence).toEqual({
    id: 'actions',
    glossaryIds: ['actions'],
    queryNames: ['activity'],
  });
  const content = view.content(result => {
    const reading = actionValues.read(result);

    return <Comparison metric={actions} reading={reading} />;
  });
  const input = calendar.request(
    { start: '2026-03-10', end: '2026-03-12' },
    true
  );
  const html = renderToStaticMarkup(
    sectionContent(content).children(
      { current: 120, previous: 100, rows: ['a'] },
      input
    )
  );
  expect(html).toContain('120');
  expect(html).toContain('20.0%');
  expect(html).toContain('Mar 10–12, 2026');
  expect(html).toContain('Mar 7–9, 2026');
  expect(
    renderToStaticMarkup(
      sectionContent(content).children(
        { current: 0, previous: null, rows: [] },
        input
      )
    )
  ).toContain('No comparable previous value');
  expect(
    renderToStaticMarkup(
      sectionContent(content).children(
        { current: 120, previous: 0, rows: [] },
        input
      )
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
  const fewerValues = view.metric(
    {
      id: 'errors',
      glossaryId: 'actions',
      format: { kind: 'count' },
      favorableDirection: 'down',
    },
    data => ({ current: data.current, previous: data.previous })
  );
  const content = view.content(result => (
    <Comparison metric={fewerIsBetter} reading={fewerValues.read(result)} />
  ));
  const input = calendar.request(
    { start: '2026-03-10', end: '2026-03-12' },
    true
  );
  const html = renderToStaticMarkup(
    sectionContent(content).children(
      { current: 120, previous: 100, rows: ['a'] },
      input
    )
  );
  expect(html).toContain('data-tone="bad"');
  expect(html).toContain('20.0%');
});

test('bound visual selectors do not run during loading or render an empty result', () => {
  let calls = 0;
  const features = view.dataset({
    name: 'Features',
    select: data => {
      calls++;
      return data.rows;
    },
    rowKey: row => row,
    columns: { feature: { value: row => row } },
    evidence: { id: 'features', queryNames: [names.activity] },
    emptyFallback: { title: 'No features' },
  });
  const content = view.content(result => (
    <BoundVisual
      dataset={features}
      source={result}
      skeleton={{ variant: 'ranking', rows: 6 }}
    >
      {rows => <p>{rows.join(', ')}</p>}
    </BoundVisual>
  ));
  expect(calls).toBe(0);
  expect(
    renderToStaticMarkup(sectionContent(content).loadingFallback).match(
      /class="altertable-content-skeleton-row"/g
    )
  ).toHaveLength(6);
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(
    renderToStaticMarkup(
      sectionContent(content).children(
        { current: 0, previous: null, rows: [] },
        input
      )
    )
  ).toContain('No features');
  expect(calls).toBe(1);
});

test('date bindings reject silently changed ranges and comparisons', () => {
  const selection = calendar.request(
    { start: '2026-03-10', end: '2026-03-12' },
    true
  );
  expect(
    resolveViewInput(getViewDefinition(view), { period: selection })
  ).toEqual(selection);
  expect(() =>
    resolveViewInput(
      {
        variables: getViewDefinition(view).variables,
        date: getViewDefinition(view).date,
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
    emptyFallback: { title: 'Empty' },
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
      emptyFallback={{ title: 'No feature use' }}
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
  const features = view.dataset({
    name: 'Features',
    select: data => data.rows,
    rowKey: row => row,
    columns: { feature: { value: row => row } },
    evidence: { id: 'features', queryNames: [names.activity] },
    emptyFallback: { title: 'No features' },
  });
  const content = view.content(result => (
    <BoundTable dataset={features} source={result} skeletonRows={3} />
  ));
  expect(
    renderToStaticMarkup(sectionContent(content).loadingFallback).match(
      /class="altertable-skeleton"/g
    )
  ).toHaveLength(3);
  const input = calendar.request({ start: '2026-03-10', end: '2026-03-12' });
  expect(
    renderToStaticMarkup(
      sectionContent(content).children(
        { current: 1, previous: null, rows: ['Insights'] },
        input
      )
    )
  ).toContain('Insights');
  expect(
    renderToStaticMarkup(
      sectionContent(content).children(
        { current: 0, previous: null, rows: [] },
        input
      )
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

test('primary request feedback is page-owned while an independent section keeps its notice', () => {
  const frame = { location: new URL('https://app.example.com') };
  Object.assign(frame, { top: frame });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: frame,
  });
  try {
    const primary: DataView<number, string> = {
      kind: 'updating',
      data: 0,
      displayedInput: 'previous',
      requestedInput: 'next',
      message: 'Updating primary results',
    };
    const secondary: DataView<number, string> = {
      kind: 'stale-error',
      data: 2,
      displayedInput: 'local previous',
      requestedInput: 'local next',
      error: new Error('Unavailable'),
      message: 'Secondary refresh failed',
    };
    const request = { view: primary, refetch() {} };
    const markup = renderToStaticMarkup(
      <DataApp
        config={{
          title: 'Feedback',
          scope: { organization: 'test', environment: 'test' },
          appearance: {},
        }}
        dataContext={context}
        request={request}
        story={() => []}
        csvExport={({ data }) => ({
          filename: 'values',
          tables: [{ name: 'Values', columns: ['Value'], rows: [[data]] }],
        })}
      >
        <DataSection
          result={request}
          loadingFallback={null}
          emptyFallback={{ title: 'No primary data' }}
        >
          {(data, input) => (
            <p>
              {data} for {input}
            </p>
          )}
        </DataSection>
        <DataSection
          result={{ view: secondary, refetch() {} }}
          loadingFallback={null}
          emptyFallback={{ title: 'No secondary data' }}
        >
          {(data, input) => (
            <p>
              {data} for {input}
            </p>
          )}
        </DataSection>
      </DataApp>
    );
    expect(
      markup.match(/class="altertable-data-boundary-notice"/g)
    ).toHaveLength(1);
    expect(markup).toContain('Secondary refresh failed');
    expect(markup).not.toContain('Updating primary results');
    expect(markup).toContain('0 for previous');
    expect(markup).toContain('2 for local previous');
    expect(markup).toContain('aria-busy="true"');
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('declared view defaults derive operation inputs without dropping explicit mappings', () => {
  const hooks = createDataHooks<{
    empty: DataOperation<Record<string, never>, number>;
    search: DataOperation<{ search: string }, number>;
    nested: DataOperation<{ filters: { search: string } }, number>;
  }>(createDataClient());
  const base = {
    describeInput: () => 'results',
    isEmpty: () => false,
    emptyFallback: { title: 'No data' },
  };
  const empty = hooks.defineDataView({
    dataContext: context,
    ...base,
    operation: 'empty',
  });
  expect(getViewDefinition(empty).variables).toEqual({});
  expect(resolveViewInput(getViewDefinition(empty), {})).toEqual({});
  const variables = { search: textVariable({ key: 'search' }) };
  const search = hooks.defineDataView({
    dataContext: context,
    ...base,
    operation: 'search',
    variables,
  });
  expect(
    resolveViewInput(getViewDefinition(search), { search: 'new' })
  ).toEqual({
    search: 'new',
  });
  const nested = hooks.defineDataView({
    dataContext: context,
    ...base,
    operation: 'nested',
    variables,
    input: values => ({ filters: values }),
  });
  expect(
    resolveViewInput(getViewDefinition(nested), { search: 'new' })
  ).toEqual({
    filters: { search: 'new' },
  });
});

test('sections inherit declared empty copy and allow local overrides', () => {
  const result = {
    view: { kind: 'empty' as const, input: {} },
    refetch() {},
    emptyFallback: { title: 'No source rows' },
  };
  function render(emptyFallback?: { title: string }) {
    return renderToStaticMarkup(
      <DataSection
        result={result}
        loadingFallback={null}
        emptyFallback={emptyFallback}
      >
        {() => 'ready'}
      </DataSection>
    );
  }
  expect(render()).toContain('No source rows');
  expect(render({ title: 'No rows in this section' })).toContain(
    'No rows in this section'
  );
  expect(render({ title: 'No rows in this section' })).not.toContain(
    'No source rows'
  );
});

test('app toolbar derives refresh actions and respects actual activity during failed retries', () => {
  const frame = { location: new URL('https://app.example.com') };
  Object.assign(frame, { top: frame });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: frame,
  });
  function render(refreshing: boolean) {
    return renderToStaticMarkup(
      <DataApp
        config={{
          appearance: {},
          title: 'Test',
          scope: { organization: 'a', environment: 'b' },
        }}
        dataContext={context}
        request={{
          view: {
            kind: 'stale-error',
            data: 1,
            requestedInput: {},
            displayedInput: {},
            error: new Error('Failed'),
            message: 'Showing prior data',
          },
          refreshing,
          refetch() {},
          cancel() {},
        }}
        story={() => []}
        csvExport={({ data }) => ({
          filename: 'data',
          tables: [{ name: 'Values', columns: ['Value'], rows: [[data]] }],
        })}
      >
        Ready
      </DataApp>
    );
  }
  try {
    expect(render(false)).toContain('Refresh data');
    expect(render(true)).toContain('Cancel refresh');
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

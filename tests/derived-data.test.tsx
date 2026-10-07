import { sectionContent } from '@/src/react/content';
import { createDataHooks } from '@/src/react/hooks';
import { DataSection } from '@/src/react/ui/DataSection';
import {
  MetricWidget,
  TableWidget,
  VisualizationWidget,
  DataValue,
  TextWidget,
} from '@/src/react/widgets';
import {
  exportDatasets,
  displayedScope,
  datasetTable,
  datasetCsv,
} from '@/src/react/bindings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dateRangeVariable } from '@altertable/data-app/react';
import { expect, test } from 'bun:test';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { DataAppProvider } from '@/src/react/mount';
import { createDataClient } from '@/src/client/data-client';
import {
  defineDateRangeContract,
  type DataOperation,
  type DateRangeRequest,
} from '@altertable/data-app/contract';
import { createDataContext } from '@altertable/data-app/react';
import { displayedSnapshot } from '@/src/core/data-view';
import { formatCsv, createCsvDownload } from '@/src/react/ui/csv-export';

function renderToStaticMarkup(content: ReactNode) {
  return renderMarkup(<DataAppProvider>{content}</DataAppProvider>);
}

const context = createDataContext({ rows: 'rows' })({
  description: 'Rows',
  glossary: {
    count: {
      term: 'Count',
      definition: 'Measured count',
      queryNames: ['rows'],
    },
  },
});
const metric = {
  id: 'count',
  glossaryId: 'count',
  format: { kind: 'count' },
} as const;
type Row = { id: string; count: number | null; available: boolean };
const hooks = createDataHooks<{
  rows: DataOperation<{ scope: string }, readonly Row[]>;
}>(createDataClient());
const view = hooks.defineDataView({
  dataContext: context,
  operation: 'rows',
  input: () => ({ scope: 'current' }),
  describeInput: input => input.scope,
  isEmpty: rows => rows.length === 0,
  emptyFallback: { title: 'No rows' },
});

function dataset(
  select: (rows: readonly Row[]) => readonly Row[] = rows => rows
) {
  return view.dataset({
    select,
    name: 'Counts',
    rowKey: row => row.id,
    evidence: {
      id: 'dataset',
      queryNames: [context.queryNames.rows],
    },
    columns: {
      id: { label: 'ID', value: row => row.id },
      count: { value: row => row.count, format: { kind: 'count' } },
      available: {
        value: row => row.available,
        format: row => (row.available ? 'Yes' : 'No'),
      },
    },
  });
}
const snapshot = {
  state: 'ready' as const,
  input: { scope: 'displayed' },
  data: [
    { id: 'A', count: 1234, available: true },
    { id: 'B', count: 0, available: false },
    { id: 'C', count: null, available: false },
  ],
};

test('datasets derive loading tables, formatted cells, and raw CSV from one declaration', () => {
  let selections = 0;
  const counts = dataset(rows => {
    selections++;
    return rows;
  });
  const loading = renderToStaticMarkup(
    <TableWidget dataset={counts} source={{ loading: true }} />
  );
  expect(selections).toBe(0);
  expect(loading).toContain('Count');
  expect(loading).toContain('altertable-skeleton');
  const ready = renderToStaticMarkup(
    <TableWidget dataset={counts} source={snapshot} />
  );
  expect(ready).toContain('1,234');
  expect(ready).toContain('—');
  expect(datasetTable(counts, snapshot).columns[1].type).toBe('number');
  expect(datasetTable(counts, snapshot).columns[2].type).toBeUndefined();
  expect(ready).toContain('Yes');
  expect(ready).toContain('No');
  const csv = datasetCsv(counts, snapshot);
  expect(csv.rows).toEqual([
    ['A', 1234, true],
    ['B', 0, false],
    ['C', null, false],
  ]);
  expect(formatCsv(csv)).toBe(
    'ID,Count,Available\r\nA,1234,true\r\nB,0,false\r\nC,,false\r\n'
  );
  expect(counts.read(snapshot).value).toBe(snapshot.data);
  const empty = renderToStaticMarkup(
    <TableWidget dataset={counts} source={{ ...snapshot, data: [] }} />
  );
  expect(empty).toContain('No results');
});

test('dataset scope and export callbacks retain displayed input through refresh and failure', () => {
  const counts = dataset();
  const other = view.dataset({
    name: 'Names',
    select: rows => rows,
    rowKey: row => row.id,
    evidence: {
      id: 'dataset',
      queryNames: [context.queryNames.rows],
    },
    columns: { id: { label: 'ID', value: row => row.id } },
  });
  for (const kind of ['updating', 'stale-error'] as const) {
    const displayed = displayedSnapshot({
      kind,
      data: snapshot.data,
      displayedInput: { scope: 'Prior / scope' },
      requestedInput: { scope: 'New scope' },
      message: 'Prior',
      error: new Error('Failed'),
    })!;
    expect(view.scope(displayed)).toBe('Prior / scope');
    expect(
      exportDatasets([counts], displayed, view.scope(displayed), 'Rows')
        .filename
    ).toBe('counts-prior-scope');
    expect(
      exportDatasets([counts], displayed, view.scope(displayed), 'Rows')
        .tables[0].rows
    ).toEqual(datasetCsv(counts, snapshot).rows);
    const all = exportDatasets(
      [counts, other],
      displayed,
      view.scope(displayed),
      'Rows'
    );
    expect(all.tables.map(table => table.name)).toEqual(['Counts', 'Names']);
    expect(createCsvDownload(all).filename).toBe('rows-prior-scope.zip');
  }
  const content = view.content(state => (
    <p>{state.scope.loading ? 'Loading scope' : state.scope.value}</p>
  ));
  expect(
    renderToStaticMarkup(sectionContent(content).loadingFallback)
  ).toContain('Loading scope');
  expect(
    renderToStaticMarkup(
      sectionContent(content).children(snapshot.data, snapshot.input)
    )
  ).toContain('displayed');
});

test('bound metrics derive loading, zero, evidence, and period comparisons for widgets and stories', () => {
  let selections = 0;
  const count = view.metric(metric, rows => {
    selections++;
    return { current: rows.reduce((sum, row) => sum + (row.count ?? 0), 0) };
  });
  renderToStaticMarkup(
    <MetricWidget metric={count} source={{ loading: true }} />
  );
  expect(selections).toBe(0);
  expect(count.definition).toEqual(context.metric(metric));
  expect(count.read(snapshot).value.current).toBe(1234);
  expect(
    count.read({
      ...snapshot,
      data: [{ id: 'zero', count: 0, available: true }],
    }).value.current
  ).toBe(0);
  const calendar = defineDateRangeContract({
    maxRangeDays: 30,
    timeZone: 'UTC',
  });
  const timeHooks = createDataHooks<{
    timed: DataOperation<DateRangeRequest, number>;
  }>(createDataClient());
  const timed = timeHooks.defineTimeView({
    dataContext: context,
    operation: 'timed',
    time: {
      contract: calendar,
      defaultValue: { kind: 'preset', id: 'last-7' },
    },
    isEmpty: () => false,
    emptyFallback: { title: 'No data' },
  });
  const comparison = timed.metric(metric, current => ({
    current,
    previous: 0,
  }));
  const period = calendar.request(
    { start: '2026-03-01', end: '2026-03-03' },
    true
  );
  expect(
    comparison.read({ state: 'ready', data: 3, input: period }).value.period
  ).toEqual(period);
  expect(
    comparison.read({ state: 'ready', data: 3, input: period }).value.previous
  ).toBe(0);
  expect(() =>
    view.metric(metric, () => ({ current: 1, previous: 0 })).read(snapshot)
  ).toThrow('date binding');
});

test('keyed datasets retain explicit accessors and identity for projected rows', () => {
  const counts = view.dataset({
    name: 'Counts',
    select: rows => rows,
    rowKey: row => row.id,
    evidence: {
      id: 'counts',
      queryNames: [context.queryNames.rows],
    },
    columns: {
      id: { value: row => row.id },
      count: { value: row => row.count, format: { kind: 'count' } },
      doubled: {
        value: row => (row.count === null ? null : row.count * 2),
        format: { kind: 'count' },
      },
      available: { label: '   ', value: row => row.available },
    },
  });
  expect(counts.read(snapshot).value).toBe(snapshot.data);
  expect(datasetTable(counts, snapshot).rowKey(snapshot.data[0]!)).toBe('A');
  expect(
    datasetTable(counts, snapshot).columns.map(column => column.id)
  ).toEqual(['id', 'count', 'doubled', 'available']);
  expect(datasetCsv(counts, snapshot).columns).toEqual([
    'Id',
    'Count',
    'Doubled',
    'Available',
  ]);
  expect(datasetCsv(counts, snapshot).rows[0]).toEqual(['A', 1234, 2468, true]);
  const projection = view.dataset({
    name: 'Projected',
    select: rows => rows.map(row => ({ key: row.id, sampleCount: row.count })),
    rowKey: row => row.key,
    evidence: { id: 'dataset', queryNames: [context.queryNames.rows] },
    columns: {
      key: { value: row => row.key },
      sampleCount: { value: row => row.sampleCount },
    },
  });
  expect(datasetCsv(projection, snapshot).columns).toEqual([
    'Key',
    'Sample count',
  ]);
  expect(datasetCsv(projection, snapshot).rows[0]).toEqual(['A', 1234]);
  const composite = view.dataset({
    name: 'Composite',
    select: rows => rows,
    rowKey: row => `${row.id}:${row.available}`,
    evidence: { id: 'dataset', queryNames: [context.queryNames.rows] },
    columns: { id: { value: row => row.id } },
  });
  expect(datasetTable(composite, snapshot).rowKey(snapshot.data[0]!)).toBe(
    'A:true'
  );
});

test('hook scope uses the automatic date description for a manually composed view', () => {
  const frame = { location: new URL('https://app.example.com') };
  Object.assign(frame, { top: frame });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: frame,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  const timeHooks = createDataHooks<{
    timed: DataOperation<DateRangeRequest, number>;
  }>(createDataClient());
  const calendar = defineDateRangeContract({
    maxRangeDays: 30,
    timeZone: 'UTC',
  });
  const period = dateRangeVariable({
    key: 'period',
    contract: calendar,
    defaultValue: { kind: 'dates', start: '2026-03-01', end: '2026-03-03' },
  });
  const dateView = timeHooks.defineDataView({
    dataContext: context,
    operation: 'timed',
    variables: { period },
    input: values => values.period,
    date: { variable: 'period', input: input => input },
    isEmpty: value => value === 0,
    emptyFallback: { title: 'No data' },
  });
  const dateContent = dateView.content(result => (
    <p>{result.scope.loading ? 'Loading scope' : result.scope.value}</p>
  ));
  function Scope() {
    return <DataSection content={dateContent} />;
  }
  function render() {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <Scope />
      </QueryClientProvider>
    );
  }
  try {
    expect(render()).toContain('Loading scope');
    const query = queryClient.getQueryCache().getAll()[0]!;
    const input = period.input(period.defaultValue);
    queryClient.setQueryData(query.queryKey, { data: 3, input, queries: [] });
    expect(render()).toContain(period.describeInput(input));
    expect(render()).not.toContain('this view');
    queryClient.setQueryData(query.queryKey, { data: 0, input, queries: [] });
    expect(render()).toContain('No data');
    expect(
      displayedScope({ kind: 'empty', input }, period.describeInput)
    ).toEqual({ loading: false, value: period.describeInput(input) });
  } finally {
    queryClient.clear();
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('datasets validate empty or blank column declarations at the boundary', () => {
  const definition = {
    name: 'Rows',
    select: (rows: readonly Row[]) => rows,
    rowKey: (row: Row) => row.id,
    evidence: {
      id: 'rows',
      queryNames: [context.queryNames.rows] as const,
    },
  };
  expect(() => view.dataset({ ...definition, columns: {} })).toThrow(
    'column IDs'
  );
  expect(() =>
    view.dataset({ ...definition, columns: { ' ': { value: row => row.id } } })
  ).toThrow('column IDs');
});

test('dataset visualizations derive displayed rows, evidence, and empty copy without loading selectors', () => {
  let selections = 0;
  const counts = dataset(rows => {
    selections++;
    return rows;
  });
  function visual(source: { loading: true } | typeof snapshot) {
    return renderToStaticMarkup(
      <VisualizationWidget dataset={counts} source={source}>
        {rows => (
          <p>
            {rows[0]?.id}: {rows[0]?.count ?? 'missing'}
          </p>
        )}
      </VisualizationWidget>
    );
  }
  expect(visual({ loading: true })).toContain('altertable-content-skeleton');
  expect(selections).toBe(0);
  expect(visual(snapshot)).toContain('A: 1234');
  expect(visual(snapshot)).toContain('Explore Counts');
  expect(visual({ ...snapshot, data: [] })).toContain('No results');
  const updating = displayedSnapshot({
    kind: 'updating',
    data: snapshot.data,
    requestedInput: { scope: 'pending' },
    displayedInput: snapshot.input,
    message: 'Updating',
  })!;
  const rows = counts.read(updating);
  expect(rows.value).toBe(snapshot.data);
});

test('narrative bindings preserve loading, formatting, measured zero, and displayed evidence', () => {
  let selections = 0;
  const total = view.metric(metric, rows => {
    selections++;
    return { current: rows.reduce((sum, row) => sum + (row.count ?? 0), 0) };
  });
  const loading = renderToStaticMarkup(
    <>
      <DataValue metric={total} source={{ loading: true }} />
      <TextWidget metric={total} source={{ loading: true }} />
    </>
  );
  expect(selections).toBe(0);
  expect(loading).toContain('altertable-skeleton');
  expect(loading).toContain('Count');
  const ready = renderToStaticMarkup(
    <>
      <DataValue metric={total} source={snapshot} />
      <TextWidget metric={total} source={snapshot} />
    </>
  );
  expect(ready).toContain('1,234');
  expect(ready).toContain('Explore Count');
  expect(
    renderToStaticMarkup(
      <DataValue metric={total} source={{ ...snapshot, data: [] }} />
    )
  ).toContain('>0</span>');
  const counts = dataset();
  expect(
    renderToStaticMarkup(
      <TextWidget dataset={counts} source={{ ...snapshot, data: [] }}>
        {rows => (rows.length ? 'Rows' : 'No recorded rows')}
      </TextWidget>
    )
  ).toContain('No recorded rows');
  expect(
    renderToStaticMarkup(
      <DataValue dataset={counts} source={snapshot}>
        {rows => rows[0]?.id}
      </DataValue>
    )
  ).toContain('>A</span>');
  expect(
    renderToStaticMarkup(
      <DataValue scope={{ loading: false, value: 'displayed scope' }} />
    )
  ).toContain('displayed scope');
});

test('views register metric labels and evidence against their own context before reading data', () => {
  const count = view.metric(metric, rows => ({ current: rows.length }));
  expect(count.definition.label).toBe('Count');
  expect(count.definition.evidence.glossaryIds).toEqual(['count']);
  expect(count.definition.evidence.queryNames).toEqual(['rows']);
  expect(() =>
    view.metric({ ...metric, glossaryId: 'missing' as 'count' }, () => {
      throw new Error('Selector must not run');
    })
  ).toThrow('Unknown glossary entry');
});

test('dataset evidence is registered by its view before data selection', () => {
  let selections = 0;
  const definition = {
    name: 'Counts',
    select: (rows: readonly Row[]) => {
      selections++;
      return rows;
    },
    rowKey: (row: Row) => row.id,
    columns: { id: { value: (row: Row) => row.id } },
  };
  const counts = view.dataset({
    ...definition,
    evidence: { id: 'counts', glossaryIds: ['count'] },
  });
  expect(counts.evidence.glossaryIds).toEqual(['count']);
  expect(selections).toBe(0);
  expect(() =>
    view.dataset({
      ...definition,
      evidence: { id: 'bad', queryNames: ['missing' as 'rows'] },
    })
  ).toThrow('Unknown query name');
  expect(selections).toBe(0);
});

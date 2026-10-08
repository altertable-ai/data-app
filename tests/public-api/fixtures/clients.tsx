import { defineDataApp } from '@altertable/data-app/config';
import { useState } from 'react';
import {
  createDataClient,
  type DataTransport,
} from '@altertable/data-app/client';
import {
  type DataOperation,
  type DimensionOption,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  createDataHooks,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app/react';

type Operations = {
  count: DataOperation<{ category: DimensionSelection<string> }, number>;
  categories: DataOperation<Record<string, never>, DimensionOption<string>[]>;
};
const pending = new Map<
  string,
  (value: Awaited<ReturnType<DataTransport>>) => void
>();
const context = createDataContext({ count: 'count' })({
  description: 'Counts',
  glossary: {},
});
function response(data: unknown): Awaited<ReturnType<DataTransport>> {
  return {
    status: 200,
    body: { data, requestId: 'fixture', queriedAt: 'now', queryIds: [] },
  };
}
function makeApp(id: string) {
  const client = createDataClient<Operations>({
    transport(operation, _input, signal) {
      if (operation === 'categories')
        return Promise.resolve(
          response([{ value: id, label: `${id} category` }])
        );
      return new Promise((resolve, reject) => {
        pending.set(id, resolve);
        signal?.addEventListener(
          'abort',
          () => {
            pending.delete(id);
            reject(signal.reason);
          },
          { once: true }
        );
      });
    },
  });
  const hooks = createDataHooks(client);
  const category = hooks.defineFacetFilter<'categories', string>({
    key: 'category',
    label: 'Category',
    valueType: 'string',
    selectionMode: 'single',
    facet: { operation: 'categories', input: () => ({}) },
  });
  const view = hooks.defineDataView({
    operation: 'count',
    dataContext: context,
    variables: { category },
    describeInput: () => `${id} scope`,
    isEmpty: () => false,
    emptyFallback: { title: 'No counts' },
  });
  const dataset = view.dataset({
    name: 'Counts',
    select: count => [count],
    rowKey: () => 'count',
    columns: { count: { value: row => row } },
    evidence: { id: 'counts', queryNames: ['count'] },
  });
  const content = view.content(source => (
    <TextWidget title={`${id} results`} dataset={dataset} source={source}>
      {rows => (
        <output aria-label={`${id} count`}>
          {id}: {rows[0]}
        </output>
      )}
    </TextWidget>
  ));
  return { view, dataset, content };
}
const a = makeApp('A');
const b = makeApp('B');
const dataApp = defineDataApp({
  title: 'Client isolation',
  scope: { organization: 'test', environment: 'test' },
  appearance: {},
  queries: {},
});
function App() {
  const [selected, setSelected] = useState(a);
  return (
    <DataApp
      view={selected.view}
      datasets={[selected.dataset]}
      story={() => []}
    >
      <button onClick={() => pending.get('A')?.(response(11))}>
        Resolve A
      </button>
      <button onClick={() => pending.get('B')?.(response(22))}>
        Resolve B
      </button>
      <button onClick={() => setSelected(b)}>Switch client</button>
      <section aria-label="Selected client">
        <DataSection content={selected.content} />
      </section>
      <section aria-label="Independent client">
        <DataSection content={b.content} />
      </section>
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

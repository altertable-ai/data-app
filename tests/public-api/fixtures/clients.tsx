import { defineDataApp } from '@altertable/data-app';
import {
  createDataHooks,
  searchFilter,
  createDataContext,
  DataApp,
  DataSection,
  TextWidget,
  mountDataApp,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import {
  createDataClient,
  type DataTransport,
} from '@altertable/data-app/client';
import {
  type DataOperation,
  type DimensionOption,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import { useState } from 'react';

type Operations = {
  count: DataOperation<
    { category: DimensionSelection<string>; search: string },
    number
  >;
  categories: DataOperation<{ search: string }, DimensionOption<string>[]>;
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
    transport(operation, input, signal) {
      const search =
        input &&
        typeof input === 'object' &&
        'search' in input &&
        typeof input.search === 'string'
          ? input.search
          : '';
      if (operation === 'categories')
        return Promise.resolve(
          response([
            { value: id, label: `${id} category${search ? ` ${search}` : ''}` },
          ])
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
  const search = searchFilter({ key: 'search', label: 'Search categories' });
  const category = hooks.defineFacetFilter({
    key: 'category',
    label: 'Category',
    valueType: 'string',
    selectionMode: 'single',
    facet: {
      context: { search },
      operation: 'categories',
      input: values => ({ search: values.search }),
    },
  });
  const filters = hooks.defineFilters({ search, category });
  const view = hooks.defineDataView({
    operation: 'count',
    dataContext: context,
    filters,
    describeInput: () => `${id} scope`,
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
  return { filters, view, dataset, content };
}
const a = makeApp('A');
const b = makeApp('B');
const dataApp = defineDataApp({
  title: 'Client isolation',
  description: 'Explore independent client requests and cache state.',
  scope: { organization: 'test', environment: 'test' },
  queries: {},
});
function App() {
  const [selected, setSelected] = useState(a);
  // <DataApp> renders the selected client's filters, so B's section, which reads
  // B's filters, stays outside it to keep its own client while A is selected.
  return (
    <>
      <DataApp
        view={selected.view}
        filters={selected.filters}
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
      </DataApp>
      <section aria-label="Independent client">
        <DataSection content={b.content} />
      </section>
    </>
  );
}
injectDataAppStyles();
mountDataApp({ app: dataApp, component: App });

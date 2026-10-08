import { useEffect } from 'react';
import {
  createDataClient,
  getDataAppNavigation,
} from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  DataApp,
  DataSection,
  MetricWidget,
  createDataHooks,
  createDataContext,
  injectDataAppStyles,
  mountDataApp,
  textVariable,
} from '@altertable/data-app/react';

type PeriodInput = { period: string };

const config = {
  title: 'Displayed context',
  scope: { organization: 'test', environment: 'prod' },
  appearance: { theme: 'system' as const },
};
function changePeriod(period: string) {
  const navigation = getDataAppNavigation()!;
  navigation.update({ ...navigation.snapshot(), search: `?period=${period}` });
}
const client = createDataClient<{
  counts: DataOperation<PeriodInput, number>;
}>({
  transport(_name, input) {
    const { period } = input as PeriodInput;
    if (period === 'last-7') return new Promise(() => {});
    return Promise.resolve({
      status: 200,
      body: {
        data: period === 'last-365' ? 84 : 42,
        requestId: period,
        queriedAt: '2026-10-07T00:00:00Z',
        queryIds: [],
        queries: [],
      },
    });
  },
});
const context = createDataContext({ counts: 'counts' })({
  description: 'Displayed context',
  glossary: {
    revenue: {
      term: 'Revenue',
      definition: 'Displayed count',
      queryNames: ['counts'],
    },
  },
});
const { defineDataView } = createDataHooks(client);
const view = defineDataView({
  dataContext: context,
  operation: 'counts',
  variables: {
    period: textVariable({
      key: 'period',
      label: 'Period',
      defaultValue: 'last-30',
    }),
  },
  describeInput: input => input.period,
  isEmpty: () => false,
  emptyFallback: { title: 'No results' },
});
const metric = view.metric(
  {
    id: 'revenue',
    glossaryId: 'revenue',
    label: 'Revenue',
    format: { kind: 'count' },
  },
  data => ({ current: data })
);
const dataset = view.dataset({
  name: 'Counts',
  select: value => [{ value }],
  rowKey: () => 'count',
  columns: { count: { value: row => row.value } },
  evidence: { id: 'counts', glossaryIds: ['revenue'] },
});
type AdvancePeriodProps = { period?: string };
function AdvancePeriod({ period }: AdvancePeriodProps) {
  useEffect(() => {
    if (period === 'last-30') changePeriod('last-7');
  }, [period]);
  return null;
}
const content = view.content(source => (
  <>
    <AdvancePeriod period={source.loading ? undefined : source.input.period} />
    <MetricWidget metric={metric} source={source} annotationId="revenue" />
  </>
));
function App() {
  return (
    <DataApp
      config={config}
      view={view}
      story={() => []}
      datasets={[dataset]}
      toolbarActions={
        <button onClick={() => changePeriod('last-365')}>
          Change displayed period
        </button>
      }
    >
      <DataSection content={content} />
    </DataApp>
  );
}
injectDataAppStyles();
mountDataApp({ config, component: App });

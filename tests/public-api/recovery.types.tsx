import type {
  AppSnapshots,
  MultiViewDataAppProps,
} from '@altertable/data-app/react';
import {
  createDataHooks,
  createDataContext,
  MetricWidget,
  DataApp,
} from '@altertable/data-app/react';
import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
const { defineDataView } =
  createDataHooks(
    createDataClient<{
      sales: DataOperation<Record<string, never>, { amount: number }>;
      users: DataOperation<{ team: string }, { count: number }>;
    }>()
  );
const dataContext = createDataContext({ sales: 'sales', users: 'users' })({
  description: 'Types',
  glossary: { amount: { term: 'Amount', definition: 'A number' } },
});
const sales = defineDataView({
  operation: 'sales',
  dataContext,
  describeInput: () => 'sales',
  isEmpty: () => false,
  emptyFallback: { title: 'None' },
});
const users = defineDataView({
  operation: 'users',
  dataContext,
  input: () => ({ team: 'all' }),
  describeInput: input => input.team,
  isEmpty: () => false,
  emptyFallback: { title: 'None' },
});
const metric = sales.metric(
  { id: 'amount', glossaryId: 'amount', format: { kind: 'count' } },
  data => ({ current: data.amount })
);
const dataset = sales.dataset({
  name: 'Sales',
  select: data => [data],
  rowKey: () => 'sales',
  evidence: { id: 'sales', queryNames: ['sales'] },
  columns: { amount: { value: row => row.amount } },
});
const views = { sales, users };
function check(snapshots: AppSnapshots<typeof views>) {
  if (snapshots.sales) {
    const amount: number = snapshots.sales.data.amount;
    // @ts-expect-error Sales snapshots do not contain user counts.
    const count = snapshots.sales.data.count;
    return [amount, count];
  }
  if (snapshots.users) {
    const count: number = snapshots.users.data.count;
    const team: string = snapshots.users.input.team;
    const wrongSource = (
      // @ts-expect-error Explicit sources retain their data/input types.
      <MetricWidget metric={metric} source={snapshots.users} />
    );
    return [count, team, wrongSource];
  }
  // @ts-expect-error Snapshots expose only registered view keys.
  return snapshots.other;
}
const valid = <MetricWidget metric={metric} />;
const multi = (
  <DataApp
    views={views}
    datasets={[dataset]}
    story={({ sales }) =>
      sales
        ? [
            {
              id: 'sales',
              headline: String(sales.data.amount),
              visual: <MetricWidget metric={metric} source={sales} />,
              evidence: metric,
            },
          ]
        : []
    }
  >
    {valid}
  </DataApp>
);
const props: MultiViewDataAppProps<typeof views> = {
  views,
  datasets: [dataset],
  story: () => [],
  children: valid,
};
void [check, multi, props];

const empty = (
  // @ts-expect-error A multi-view app needs at least one declared view.
  <DataApp views={{}} datasets={[dataset]} story={() => []}>
    {null}
  </DataApp>
);
void empty;

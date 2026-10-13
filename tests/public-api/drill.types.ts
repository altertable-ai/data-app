import { createDataClient } from '@altertable/data-app/client';
import type { DataOperation } from '@altertable/data-app/contract';
import {
  createDataContext,
  createDataHooks,
  type DetailContent,
} from '@altertable/data-app/react';

const context = createDataContext({ sales: 'sales', orders: 'orders' })({
  description: 'Sales',
  glossary: {},
});
const hooks =
  createDataHooks(
    createDataClient<{
      sales: DataOperation<Record<string, never>, { regionId: number }[]>;
      orders: DataOperation<{ regionId: number }, { orderId: string }[]>;
    }>()
  );
const sales = hooks.defineDataView({
  operation: 'sales',
  dataContext: context,
  describeInput: () => 'All sales',
  isEmpty: data => data.length === 0,
  emptyFallback: { title: 'No sales' },
});
const regions = sales.dataset({
  name: 'Regions',
  select: data => data,
  rowKey: row => row.regionId,
  columns: { region: { value: row => row.regionId } },
  evidence: { id: 'regions', queryNames: ['sales'] },
});
const orders = hooks.defineDetailView({
  id: 'orders',
  title: 'Orders',
  operation: 'orders',
  dataContext: context,
  parseInput: value => value as { regionId: number },
  describeInput: input => `Region ${input.regionId}`,
  isEmpty: data => data.length === 0,
  emptyFallback: { title: 'No orders' },
});
const records = orders.dataset({
  name: 'Orders',
  select: data => data,
  rowKey: row => row.orderId,
  columns: { id: { value: row => row.orderId } },
  evidence: { id: 'orders', queryNames: ['orders'] },
});
const content: DetailContent = orders.content(
  source => (source.loading ? 'Loading' : source.data[0]?.orderId),
  {
    datasets: [records],
    story: () => [],
  }
);
regions.drill({
  id: 'orders',
  label: 'View orders',
  target: orders,
  input: row => ({ regionId: row.regionId }),
});
regions.drill({
  id: 'orders',
  label: 'View orders',
  target: orders,
  // @ts-expect-error Destination IDs are numeric; formatted strings are not valid inputs.
  input: row => ({ regionId: String(row.regionId) }),
});
regions.drill({
  id: 'orders',
  label: 'View orders',
  target: orders,
  // @ts-expect-error Required destination scope cannot be omitted.
  input: () => ({}),
});
orders.content(() => null, {
  // @ts-expect-error Detail exports must use datasets owned by the destination result shape.
  datasets: [regions],
  story: () => [],
});
void content;

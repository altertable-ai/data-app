import type {
  LineChartProps,
  AreaChartProps,
  PieChartProps,
  BarChartProps,
} from '@altertable/data-app/react/ui';
import type { BoundExplorationActions } from '@altertable/data-app/react';

type Day = { id: string; label: string; value: number; day: string };
function verifyChartActions(actions: BoundExplorationActions<Day>) {
  const props: LineChartProps<Day> = {
    items: [{ id: 'monday', label: 'Monday', value: 12, day: '2026-10-12' }],
    ariaLabel: 'Daily orders',
    unit: 'orders',
    actionLabel: 'View orders',
    onItemAction(item, trigger) {
      const day: string = item.day;
      const element: HTMLElement = trigger;
      void [day, element];
    },
  };
  const pie: PieChartProps<Day> = props;
  const area: AreaChartProps<Day> = props;
  const bar: BarChartProps<Day> = props;
  // @ts-expect-error Bound actions and imperative callbacks are alternative contracts.
  const mixed: LineChartProps<Day> = { ...props, itemActions: actions };
  // @ts-expect-error Imperative actions require an accessible action label.
  const unlabeled: PieChartProps<Day> = {
    items: [],
    ariaLabel: 'Orders',
    unit: 'orders',
    onItemAction() {},
  };
  void [pie, area, bar, mixed, unlabeled];
}
void verifyChartActions;

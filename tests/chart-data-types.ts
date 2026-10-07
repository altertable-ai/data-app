import { defineChartItems, type ChartItem } from '@altertable/data-app/react';

/** Compile-only authoring examples; invalid inputs must fail before preview. */
export function chartDataTypes(
  dynamic: readonly ChartItem[],
  computedId: 'a' | 'b'
) {
  defineChartItems('line', [
    { id: computedId, label: 'Computed', value: 1 },
    { id: 'a', label: 'A', value: 2 },
  ]);
  const points = defineChartItems('line', [
    { id: 'a', label: 'First', value: -2 },
    { id: 'b', label: 'Second', value: 0 },
  ]);
  const firstId: 'a' = points[0].id;
  defineChartItems('bar', dynamic);
  defineChartItems('scatter', [{ id: 'a', label: 'A', x: -2, y: 3 }]);
  defineChartItems('pie', []);
  // @ts-expect-error Duplicate literal IDs are rejected.
  defineChartItems('line', [
    { id: 'a', label: 'A', value: 1 },
    { id: 'a', label: 'B', value: 2 },
  ]);
  // @ts-expect-error Scatter uses the same literal identity checks.
  defineChartItems('scatter', [
    { id: 'a', label: 'A', x: 1, y: 2 },
    { id: 'a', label: 'B', x: 3, y: 4 },
  ]);
  // @ts-expect-error Whitespace-only literal IDs are rejected.
  defineChartItems('area', [{ id: ' \t\n', label: 'A', value: 1 }]);
  // @ts-expect-error Negative bar values cannot be rendered.
  defineChartItems('bar', [{ id: 'a', label: 'A', value: -1 }]);
  // @ts-expect-error Negative pie shares cannot be rendered.
  defineChartItems('pie', [{ id: 'a', label: 'A', value: -1 }]);
  // @ts-expect-error Scatter observations require both coordinates.
  defineChartItems('scatter', [{ id: 'a', label: 'A', x: 2 }]);
  // @ts-expect-error Category values must be numbers.
  defineChartItems('bar', [{ id: 'a', label: 'A', value: '2' }]);
  return firstId;
}

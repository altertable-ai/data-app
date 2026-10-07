import { invariant } from '@/src/core/invariant';

/** Ordered category or time-series sample. IDs are unique and nonblank; values are finite. */
export type ChartItem = { id: string; label: string; value: number };
export type ValueChartProps = {
  /** Ordered samples; use defineChartItems() to check authored data before rendering. */
  items: readonly ChartItem[];
  unit: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
};

/** Independent observation on two finite numeric axes. */
export type ScatterChartItem = {
  id: string;
  label: string;
  x: number;
  y: number;
};
export type ChartKind = 'bar' | 'line' | 'area' | 'pie' | 'scatter';
type ItemFor<Kind extends ChartKind> = Kind extends 'scatter'
  ? ScatterChartItem
  : ChartItem;
type Whitespace = ' ' | '\t' | '\n' | '\r';
type Trim<Value extends string> = Value extends `${Whitespace}${infer Rest}`
  ? Trim<Rest>
  : Value extends `${infer Rest}${Whitespace}`
    ? Trim<Rest>
    : Value;
type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never;
type Invalid<Message extends string> = { readonly chartDataError: Message };
type CheckItems<
  Kind extends ChartKind,
  Items extends readonly { id: string }[],
  Seen extends string = never,
> = Items extends readonly [
  infer First extends { id: string },
  ...infer Rest extends readonly { id: string }[],
]
  ? string extends First['id']
    ? CheckItems<Kind, Rest, Seen>
    : IsUnion<First['id']> extends true
      ? CheckItems<Kind, Rest, Seen>
      : Trim<First['id']> extends ''
        ? Invalid<'Chart IDs must not be blank'>
        : First['id'] extends Seen
          ? Invalid<`Duplicate chart ID: ${First['id']}`>
          : Kind extends 'bar' | 'pie'
            ? First extends { value: infer Value extends number }
              ? `${Value}` extends `-${string}`
                ? Invalid<'Bar and pie values must be nonnegative'>
                : CheckItems<Kind, Rest, Seen | First['id']>
              : never
            : CheckItems<Kind, Rest, Seen | First['id']>
  : unknown;

/** Prepare ordered data before rendering. Literal tuples check IDs and negative bar/pie
 * values at compile time. Dynamic arrays, non-finite numbers, and computed IDs are checked
 * at runtime. Returns the original array; no sorting, deduplication, or mutation. */
export function defineChartItems<
  Kind extends ChartKind,
  const Items extends readonly ItemFor<Kind>[],
>(kind: Kind, items: Items & CheckItems<Kind, Items>): Items {
  validateChartItems(kind, items);
  return items;
}

/** Direct component callers receive the same runtime checks as prepared data. */
export function validateChartItems<Kind extends ChartKind>(
  kind: Kind,
  items: readonly ItemFor<Kind>[]
): void {
  const ids = new Set<string>();
  for (const item of items) {
    invariant(
      item.id.trim().length > 0,
      `${kind} chart IDs must be nonempty and unique: blank ID.`
    );
    invariant(
      !ids.has(item.id),
      `${kind} chart IDs must be nonempty and unique: duplicate "${item.id}".`
    );
    ids.add(item.id);
    if (kind === 'scatter') {
      const point = item as ScatterChartItem;
      invariant(
        Number.isFinite(point.x) && Number.isFinite(point.y),
        `scatter chart "${item.id}" requires finite values for x and y.`
      );
    } else {
      const point = item as ChartItem;
      invariant(
        Number.isFinite(point.value),
        `${kind} chart "${item.id}" requires finite values.`
      );
      invariant(
        (kind !== 'bar' && kind !== 'pie') || point.value >= 0,
        `${kind} chart "${item.id}" requires nonnegative values.`
      );
    }
  }
}

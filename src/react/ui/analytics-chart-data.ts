import { invariant } from '@/src/core/invariant';

export type AnalyticsChartProps = {
  /** Accessible measure and scope description. */
  ariaLabel: string;
  /** Population unit, such as users or sessions. */
  unit: string;
  /** Formats counts; rates use percentage formatting. */
  formatValue?: (value: number) => string;
  className?: string;
};

export function formatAnalyticsValue(value: number) {
  return new Intl.NumberFormat().format(value);
}
export function formatAnalyticsRate(value: number | null) {
  return value === null
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 1,
      }).format(value);
}

export function validateAnalyticsIds(
  kind: string,
  items: readonly { id: string }[]
) {
  const ids = new Set<string>();
  for (const { id } of items) {
    invariant(
      id.trim().length > 0 && !ids.has(id),
      `${kind} chart IDs must be nonblank and unique.`
    );
    ids.add(id);
  }
}

export function validateAnalyticsCount(kind: string, value: number) {
  invariant(
    Number.isFinite(value) && value >= 0,
    `${kind} chart counts must be finite and nonnegative.`
  );
}

import type { DateRangeRequest } from '@/src/core/contract';

export type DataReading<Value> =
  | { loading: true; value?: never }
  | { loading: false; value: Value };

export type MetricValues = { current: number; previous?: number | null };
export type MetricReading = DataReading<
  MetricValues & { period?: DateRangeRequest }
>;

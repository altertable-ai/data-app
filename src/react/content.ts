import type { ReactNode } from 'react';
import type {
  DataReading,
  MetricReading,
  MetricValues,
} from '@/src/core/reading';
import type { DateRangeRequest } from '@/src/core/contract';
import { invariant } from '@/src/core/invariant';

export type DataContentHelpers<Data, Input> = {
  select: <Value>(
    select: (data: Data, input: Input) => Value
  ) => DataReading<Value>;
  metric: (select: (data: Data) => MetricValues) => MetricReading;
};

export type DataContentState<Data, Input> = DataContentHelpers<Data, Input> &
  (
    | { loading: true; data?: never; input?: never }
    | { loading: false; data: Data; input: Input }
  );

type ContentOptions<Input> = { date?: (input: Input) => DateRangeRequest };

/** Selectors run only for displayed data, including its original comparison input. */
export function createDataContentState<Data, Input>(
  snapshot: { data: Data; input: Input } | null,
  options: ContentOptions<Input> = {}
): DataContentState<Data, Input> {
  if (!snapshot)
    return {
      loading: true,
      select() {
        return { loading: true };
      },
      metric() {
        return { loading: true };
      },
    };
  const { data, input } = snapshot;
  return {
    loading: false,
    data,
    input,
    select(select) {
      return { loading: false, value: select(data, input) };
    },
    metric(select) {
      const values = select(data);
      invariant(
        values.previous === undefined || options.date,
        'Metric comparisons require a view date binding.'
      );
      return {
        loading: false,
        value: { ...values, period: options.date?.(input) },
      };
    },
  };
}

/** Optional reusable composition for DataApp's explicit layout or a DataSection. */
export function defineDataContent<Data, Input>(
  render: (state: DataContentState<Data, Input>) => ReactNode,
  options: ContentOptions<Input> = {}
) {
  return {
    loading: render(createDataContentState<Data, Input>(null, options)),
    children(data: Data, input: Input) {
      return render(createDataContentState({ data, input }, options));
    },
  };
}

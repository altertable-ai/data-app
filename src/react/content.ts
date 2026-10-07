import type { ReactNode } from 'react';
import type {
  DataReading,
  MetricReading,
  MetricValues,
} from '@/src/core/reading';
import type { DateRangeRequest } from '@/src/core/contract';
import { invariant } from '@/src/core/invariant';

export type DataContentHelpers<Data, Input> = {
  scope: DataReading<string>;
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

/** Selectors run only for displayed data. Date comparisons inherit that result's input. */
export function defineDataContent<Data, Input>(
  render: (state: DataContentState<Data, Input>) => ReactNode,
  options: {
    date?: (input: Input) => DateRangeRequest;
    describeInput?: (input: Input) => string;
  } = {}
) {
  return {
    loadingFallback: render({
      loading: true,
      scope: { loading: true },
      select() {
        return { loading: true };
      },
      metric() {
        return { loading: true };
      },
    }),
    children(this: void, data: Data, input: Input) {
      return render({
        loading: false,
        data,
        input,
        scope: {
          loading: false,
          value: options.describeInput?.(input) ?? 'this view',
        },
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
      });
    },
  };
}

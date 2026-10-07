import type { ReactNode } from 'react';
import type { DataReading } from '@/src/core/reading';

export type DataContentState<Data, Input> = { scope: DataReading<string> } & (
  | { loading: true; data?: never; input?: never }
  | { loading: false; data: Data; input: Input }
);

/** Content receives only displayed data, its original input, and the derived scope. */
export function defineDataContent<Data, Input>(
  render: (state: DataContentState<Data, Input>) => ReactNode,
  options: {
    describeInput?: (input: Input) => string;
  } = {}
) {
  return {
    loadingFallback: render({
      loading: true,
      scope: { loading: true },
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
      });
    },
  };
}

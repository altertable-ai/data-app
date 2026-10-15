import type { ReactNode } from 'react';
import type { ReadableSource } from '@altertable/data-app/react';
export function defineDataContent<Data, Input>(
  render: (source: ReadableSource<Data, Input>) => ReactNode
) {
  return {
    loadingFallback: render({ state: 'loading' }),
    children(data: Data, input: Input) {
      return render({ state: 'ready', data, input });
    },
  };
}

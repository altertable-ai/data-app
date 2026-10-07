import { createContext } from 'react';
import type { ReactNode } from 'react';
import type { DataView, DisplayedSnapshot } from '@/src/core/data-view';
import type { DisclosedQuery } from '@/src/core/contract';
import type { EmptyContent } from '@/src/react/ui/presentation';

export type ViewResult<Data, Input> = {
  view: DataView<Data, Input>;
  snapshot?: DisplayedSnapshot<Data, Input>;
  refetch: () => unknown;
  cancel: () => unknown;
  refreshing: boolean;
  queries?: DisclosedQuery[];
  controls?: ReactNode;
  emptyFallback: EmptyContent;
};

/** The executor is private; declarations expose data composition, not subscription hooks. */
export class DeclaredView<Data, Input> {
  #useResult: () => ViewResult<Data, Input>;
  constructor(useResult: () => ViewResult<Data, Input>) {
    this.#useResult = useResult;
  }
  static useResult<Data, Input>(
    view: DeclaredView<Data, Input>
  ): ViewResult<Data, Input> {
    return view.#useResult();
  }
}

export function useDeclaredResult<Data, Input>(
  view: DeclaredView<Data, Input>
): ViewResult<Data, Input> {
  return DeclaredView.useResult(view);
}

export const PrimaryViewContext = createContext<{
  declaration: object;
  result: ViewResult<unknown, unknown>;
} | null>(null);

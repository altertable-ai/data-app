import { type DisclosedQuery } from '@altertable/data-app/contract';
import {
  type DataView,
  type DisplayedSnapshot,
} from '@altertable/data-app/internal';
import { createContext, type ReactNode } from 'react';

import { type DataContext } from './ui/data-context.ts';
import { type EmptyContent } from './ui/presentation.ts';

export type ViewResult<Data, Input> = {
  dataContext: DataContext;
  timeZone?: string;
  view: DataView<Data, Input>;
  snapshot?: DisplayedSnapshot<Data, Input>;
  refetch: () => unknown;
  cancel: () => unknown;
  refreshing: boolean;
  queries?: DisclosedQuery[];
  searchControls?: ReactNode;
  filterControls?: ReactNode;
  emptyFallback: EmptyContent;
};

/** The executor is private; declarations expose data composition, not subscription hooks. */
export class DeclaredView<Data, Input, Definition = unknown> {
  #definition: Definition | undefined;
  #useResult: () => ViewResult<Data, Input>;
  constructor(
    useResult: () => ViewResult<Data, Input>,
    definition?: Definition
  ) {
    this.#definition = definition;
    this.#useResult = useResult;
  }
  static definition<Data, Input, Definition>(
    view: DeclaredView<Data, Input, Definition>
  ): Definition {
    if (view.#definition === undefined)
      throw new Error('Missing view definition.');
    return view.#definition;
  }
  static useResult<View extends DeclaredView<unknown, unknown>>(
    view: View
  ): DeclaredViewResult<View> {
    return view.#useResult() as DeclaredViewResult<View>;
  }
}

/** Distribute across declarations so each result keeps its own data and input together. */
type DeclaredViewResult<View> =
  View extends DeclaredView<infer Data, infer Input>
    ? ViewResult<Data, Input>
    : never;

export function useDeclaredResult<View extends DeclaredView<unknown, unknown>>(
  view: View
): DeclaredViewResult<View> {
  return DeclaredView.useResult(view);
}

export const PrimaryViewContext = createContext<{
  declaration: object;
  result: ViewResult<unknown, unknown>;
} | null>(null);

export function getViewDefinition<Data, Input, Definition>(
  view: DeclaredView<Data, Input, Definition>
): Definition {
  return DeclaredView.definition(view);
}

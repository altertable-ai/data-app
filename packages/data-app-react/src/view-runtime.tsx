import { type DisclosedQuery } from '@altertable/data-app/contract';
import {
  invariant,
  type DataView,
  type DisplayedSnapshot,
  type FilterCollection,
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
  emptyFallback: EmptyContent;
};

/** Whether the view may send its request now. A disabled view stays loading until enabled. */
export type ViewRequest = { enabled: boolean };

/** The executor is private; declarations expose data composition, not subscription hooks. */
export class DeclaredView<Data, Input, Definition = unknown> {
  #definition: Definition | undefined;
  #useResult: (request: ViewRequest) => ViewResult<Data, Input>;
  constructor(
    useResult: (request: ViewRequest) => ViewResult<Data, Input>,
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
    view: View,
    request: ViewRequest
  ): DeclaredViewResult<View> {
    return view.#useResult(request) as DeclaredViewResult<View>;
  }
}

/** Distribute across declarations so each result keeps its own data and input together. */
type DeclaredViewResult<View> =
  View extends DeclaredView<infer Data, infer Input>
    ? ViewResult<Data, Input>
    : never;

export function useDeclaredResult<View extends DeclaredView<unknown, unknown>>(
  view: View,
  request: ViewRequest = { enabled: true }
): DeclaredViewResult<View> {
  return DeclaredView.useResult(view, request);
}

export type FilterControls = {
  searchControls: ReactNode;
  filterControls: ReactNode;
};

/** Every filter one client's operations read, and the hook rendering their controls. */
export type ClientFilters = {
  filters: FilterCollection;
  useControls: () => FilterControls;
};

/** The views `<DataApp>` runs, so their sections reuse its results instead of requesting again.
 * The primary view's result aggregates the app's requests. */
export const AppViewResultsContext = createContext<{
  primaryView: DeclaredView<unknown, unknown>;
  clientFilters: ClientFilters;
  results: ReadonlyMap<object, ViewResult<unknown, unknown>>;
} | null>(null);

/** `<DataApp>` renders the controls of its client's filters, so every view it shows
 * must come from the same `createDataHooks()` result. */
export function assertAppFilters(
  view: DeclaredView<unknown, unknown>,
  clientFilters: ClientFilters
) {
  const definition = getViewDefinition(view) as {
    clientFilters?: ClientFilters;
  };
  invariant(
    !definition.clientFilters || definition.clientFilters === clientFilters,
    'Views inside <DataApp> must come from the same createDataHooks() client, which owns their filter controls.'
  );
}

export function getViewDefinition<Data, Input, Definition>(
  view: DeclaredView<Data, Input, Definition>
): Definition {
  return DeclaredView.definition(view);
}

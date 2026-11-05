import { type DisclosedQuery } from '@altertable/data-app/contract';
import {
  invariant,
  type DataView,
  type DisplayedSnapshot,
  type VariableCollection,
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

/** The views `<DataApp>` runs, so their sections reuse its results instead of requesting again.
 * The primary view's result aggregates the app's requests. */
export const AppViewResultsContext = createContext<{
  primaryView: DeclaredView<unknown, unknown>;
  results: ReadonlyMap<object, ViewResult<unknown, unknown>>;
} | null>(null);

/** `<DataApp>` renders filter controls from its own view only, so any other view it
 * shows must declare its filters there too. */
export function assertAppRendersFilters(
  view: DeclaredView<unknown, unknown>,
  appView: DeclaredView<unknown, unknown>
) {
  const appFilters = filterNames(appView);
  invariant(
    filterNames(view).every(name => appFilters.includes(name)),
    'A view’s filters must also be declared on the app view, which renders their controls.'
  );
}

function filterNames(view: DeclaredView<unknown, unknown>): string[] {
  const { variables } = getViewDefinition(view) as {
    variables?: VariableCollection;
  };
  return Object.keys(variables ?? {});
}

export function getViewDefinition<Data, Input, Definition>(
  view: DeclaredView<Data, Input, Definition>
): Definition {
  return DeclaredView.definition(view);
}

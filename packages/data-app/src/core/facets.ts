import type { FilterCollection } from './app-filters.ts';
import type { DimensionSelectionFilter, DimensionValue } from './dimension.ts';

/** Executable facet sources are attached only by the typed hooks factory. */
export const facetSource = Symbol('data-app.facetSource');
type FacetSourceDefinition<
  Context extends FilterCollection = FilterCollection,
  Name extends string = string,
  Input = unknown,
> = {
  readonly context: Context;
  readonly operation: Name;
  readonly input: (values: Record<string, unknown>) => Input;
};
export type FacetFilter<
  Value extends DimensionValue,
  Context extends FilterCollection,
  Name extends string,
  Input,
> = DimensionSelectionFilter<Value> & {
  readonly optionsSource: 'query';
  readonly [facetSource]: FacetSourceDefinition<Context, Name, Input>;
};

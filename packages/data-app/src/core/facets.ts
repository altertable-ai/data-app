import type { DimensionSelectionFilter, DimensionValue } from './dimension.ts';

export const facetSource = Symbol('data-app.facetSource');

/** A dimension whose options come from an operation. The options follow that
 * operation's own filters, so selecting a period narrows the choices. */
export type FacetFilter<
  Value extends DimensionValue = DimensionValue,
  Operation extends string = string,
> = DimensionSelectionFilter<Value> & {
  readonly optionsSource: 'query';
  readonly [facetSource]: { readonly operation: Operation };
};

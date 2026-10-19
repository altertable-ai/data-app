import type {
  DimensionSelectionVariable,
  DimensionValue,
} from './dimension.ts';
import type { VariableCollection } from './variables.ts';

/** Executable facet sources are attached only by the typed hooks factory. */
export const facetSource = Symbol('data-app.facetSource');
type FacetSourceDefinition<
  Context extends VariableCollection = VariableCollection,
  Name extends string = string,
  Input = unknown,
> = {
  readonly context: Context;
  readonly operation: Name;
  readonly input: (values: Record<string, unknown>) => Input;
};
export type FacetVariable<
  Value extends DimensionValue,
  Context extends VariableCollection,
  Name extends string,
  Input,
> = DimensionSelectionVariable<Value> & {
  readonly optionsSource: 'query';
  readonly [facetSource]: FacetSourceDefinition<Context, Name, Input>;
};

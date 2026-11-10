import {
  createDimensionFilter,
  type DimensionFilterSettings,
  type DimensionValue,
} from './dimension.ts';
import { facetSource, type FacetFilter } from './facets.ts';

type FacetFilterOptions<
  Value extends DimensionValue,
  Operation extends string,
> = DimensionFilterSettings<Value> & {
  /** The registered operation that returns this dimension's options. */
  options: Operation;
};

/** Options load from `options`, an operation returning `DimensionOption[]`; the
 * client checks that it is registered. Validate selections like any dimension. */
export function facetFilter<const Operation extends string>(
  config: FacetFilterOptions<string, Operation> & { valueType: 'string' }
): FacetFilter<string, Operation>;
export function facetFilter<const Operation extends string>(
  config: FacetFilterOptions<number, Operation> & { valueType: 'number' }
): FacetFilter<number, Operation>;
export function facetFilter<
  Value extends DimensionValue,
  const Operation extends string,
>({
  options: operation,
  ...settings
}: FacetFilterOptions<Value, Operation>): FacetFilter<Value, Operation> {
  return Object.assign(
    createDimensionFilter<Value>({ ...settings, options: [] }, true),
    {
      optionsSource: 'query' as const,
      [facetSource]: Object.freeze({ operation }),
    }
  );
}

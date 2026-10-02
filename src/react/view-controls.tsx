import { VariableValueSelector } from '@/src/react/ui/VariableValueSelector';
import type { VariableValue } from '@/src/core/query-variables';
import type { ReactNode } from 'react';
import { useQueries } from '@tanstack/react-query';
import { SearchField } from '@/src/react/ui/SearchField';
import { Combobox } from '@/src/react/ui/Combobox';
import { DateRangePicker } from '@/src/react/ui/DateRangePicker';
import { DimensionPicker } from '@/src/react/ui/DimensionPicker';
import {
  parseFacetOptions,
  type DimensionSelection,
  type DimensionVariable,
} from '@/src/core/dimension';
import {
  dateRangeControl,
  useAppVariables,
  type AppVariableValues,
  type VariableCollection,
  type DateRangeSelection,
} from '@/src/react/ui/variables';
import type { ResolvedVariables } from '@/src/react/view';

/** URL values resolve before facets; facet keys include their dependent inputs for cached, bounded loading. */
export function useViewVariables<Variables extends VariableCollection>(
  definitions: Variables,
  clientScope: string,
  loadFacet: (
    operation: string,
    input: unknown,
    signal: AbortSignal
  ) => Promise<unknown>
) {
  const variables = useAppVariables(definitions);
  const resolved = {} as ResolvedVariables<Variables>;
  for (const name of Object.keys(definitions) as (keyof Variables & string)[]) {
    const definition = definitions[name]!;
    const value = variables.values[name];
    resolved[name] = (
      definition.kind === 'dateRange'
        ? definition.input(value as DateRangeSelection)
        : value
    ) as ResolvedVariables<Variables>[typeof name];
  }
  const facets = Object.entries(definitions).filter(
    (entry): entry is [string, DimensionVariable<any>] =>
      entry[1].kind === 'dimension' && !!entry[1].facet
  );
  const facetQueries = useQueries({
    queries: facets.map(([name, filter]) => {
      const facet = filter.facet!;
      const input = facet.input({ ...resolved, [name]: { kind: 'all' } });

      return {
        queryKey: [
          'dimension-facet',
          clientScope,
          name,
          facet.operation,
          input,
        ],
        queryFn({ signal }: { signal: AbortSignal }) {
          return loadFacet(facet.operation, input, signal).then(result =>
            parseFacetOptions(result, filter)
          );
        },
        staleTime: 60_000,
        gcTime: 300_000,
      };
    }),
  });
  const facetState = new Map(
    facets.map(([name], index) => [name, facetQueries[index]!])
  );
  const controls: ReactNode[] = [];
  for (const name of Object.keys(definitions) as (keyof Variables & string)[]) {
    const definition = definitions[name]!;
    const value = variables.values[name];
    if (definition.kind === 'dateRange') {
      const selection = value as DateRangeSelection;
      controls.push(
        <DateRangePicker
          key={name}
          {...dateRangeControl(definition, selection, next =>
            variables.set(
              name,
              next as AppVariableValues<Variables>[typeof name]
            )
          )}
        />
      );
    } else if (definition.kind === 'query') {
      controls.push(
        <VariableValueSelector
          key={name}
          label={definition.label ?? name}
          definition={definition.definition}
          value={value as VariableValue | null}
          onChange={next =>
            variables.set(
              name,
              next as AppVariableValues<Variables>[typeof name]
            )
          }
        />
      );
    } else if (definition.kind === 'dimension') {
      const filter = definition as DimensionVariable;
      const facet = facetState.get(name);
      controls.push(
        <DimensionPicker
          key={name}
          filter={filter}
          value={value as DimensionSelection}
          options={facet?.data ?? filter.options}
          loading={!!facet?.isPending}
          error={!!facet?.isError}
          onRetry={() => void facet?.refetch()}
          onChange={next =>
            variables.set(
              name,
              next as AppVariableValues<Variables>[typeof name]
            )
          }
        />
      );
    } else {
      const binding = {
        label: definition.label ?? name,
        value: value as string,
        onChange(next: string) {
          return variables.set(
            name,
            next as AppVariableValues<Variables>[typeof name]
          );
        },
        resetValue: definition.defaultValue,
      };
      if (definition.kind === 'select' && definition.options)
        controls.push(
          <Combobox key={name} {...binding} options={[...definition.options]} />
        );
      else if (definition.kind === 'text')
        controls.push(<SearchField key={name} {...binding} />);
    }
  }

  return {
    ...variables,
    resolved,
    controls: controls.length ? controls : null,
  };
}

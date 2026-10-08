import type { ReactNode } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Fragment } from 'react';
import { Select } from '@/src/react/ui/Select';
import {
  ActiveFilters,
  FilterActions,
  type ActiveFilter,
} from '@/src/react/ui/ActiveFilters';
import { NumberFilterControl } from '@/src/react/ui/NumberFilterControl';
import type {
  NumberFilter,
  NumberSelection,
  BooleanSelection,
} from '@/src/core/filters';
import type { AppVariable } from '@/src/core/variables';
import { SearchField } from '@/src/react/ui/SearchField';
import { ChoicePicker } from '@/src/react/ui/ChoicePicker';
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
    } else if (definition.kind === 'numberFilter') {
      controls.push(
        <NumberFilterControl
          key={name}
          filter={definition as NumberFilter}
          value={value as NumberSelection}
          onChange={next =>
            variables.set(
              name,
              next as AppVariableValues<Variables>[typeof name]
            )
          }
        />
      );
    } else if (definition.kind === 'booleanFilter') {
      const selected = value as BooleanSelection;
      controls.push(
        <Select
          key={name}
          label={definition.label}
          value={selected.kind === 'all' ? 'all' : String(selected.value)}
          options={[
            { id: 'all', label: 'Any' },
            { id: 'true', label: 'Yes' },
            { id: 'false', label: 'No' },
          ]}
          onChange={next =>
            variables.set(
              name,
              (next === 'all'
                ? { kind: 'all' }
                : {
                    kind: 'is',
                    value: next === 'true',
                  }) as AppVariableValues<Variables>[typeof name]
            )
          }
        />
      );
    } else if (definition.kind === 'multiChoice') {
      controls.push(
        <ChoicePicker
          key={name}
          selectionMode="multiple"
          label={definition.label ?? name}
          options={definition.options}
          values={value as readonly string[]}
          maxSelected={definition.maxSelected}
          emptySelectionLabel="None"
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
        onChange: (next: string) =>
          variables.set(
            name,
            next as AppVariableValues<Variables>[typeof name]
          ),
        resetValue: definition.defaultValue,
      };
      if (definition.kind === 'choice')
        controls.push(
          <Select
            key={name}
            label={binding.label}
            value={binding.value}
            onChange={binding.onChange}
            options={definition.options}
          />
        );
      else if (definition.kind === 'search')
        controls.push(<SearchField key={name} {...binding} />);
    }
  }
  const active: ActiveFilter[] = [];
  for (const [name, definition] of Object.entries(definitions)) {
    const variable = definition as AppVariable<any>;
    const value = variables.values[name];
    if (
      variable.clearValue !== undefined &&
      !variable.same(value, variable.clearValue)
    )
      active.push({
        id: name,
        label: `${variable.label ?? name}: ${variable.describe?.(value) ?? String(value)}`,
        onRemove: () =>
          variables.update(
            { [name]: variable.clearValue } as Partial<
              AppVariableValues<Variables>
            >,
            'push'
          ),
      });
  }
  if (active.length)
    controls.push(
      <Fragment key="filter-actions">
        <ActiveFilters filters={active} />
        <FilterActions
          onClear={active.length ? variables.clearAll : undefined}
        />
      </Fragment>
    );

  return {
    ...variables,
    resolved,
    controls: controls.length ? controls : null,
  };
}

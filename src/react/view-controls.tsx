import { HiddenViewVariablesContext } from '@/src/react/view-runtime';
import { useContext, type ReactNode } from 'react';
import { SearchTypeahead } from '@/src/react/ui/SearchTypeahead';
import {
  SearchSuggestionsContext,
  balanceSearchSuggestions,
} from '@/src/react/search-suggestions';
import type { ControlLabelPlacement } from '@/src/react/ui/PickerField';
import { useQueries } from '@tanstack/react-query';
import { Select } from '@/src/react/ui/Select';
import {
  ViewControlBar,
  type ActiveFilterControl,
  type ViewControlBarProps,
} from '@/src/react/view-control-bar';
import { NumberFilterPicker } from '@/src/react/ui/NumberFilterPicker';
import type {
  NumberFilter,
  NumberSelection,
  BooleanSelection,
} from '@/src/core/filters';
import type { AppVariable } from '@/src/core/variables';
import { SearchField, type SearchFieldProps } from '@/src/react/ui/SearchField';
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
  const hidden = useContext(HiddenViewVariablesContext);
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
  const primaryFilters: ReactNode[] = [];
  const displayOptions: { primary: ReactNode[]; secondary: ReactNode[] } = {
    primary: [],
    secondary: [],
  };
  const allFilters: ReactNode[] = [];
  const activeSecondaryFilters: ActiveFilterControl[] = [];
  let activeFilterCount = 0;
  let changedDisplayOptionCount = 0;
  let hasActiveFilters = false;
  const clearedFilters: Partial<AppVariableValues<Variables>> = {};
  const searchControls: ReactNode[] = [];
  for (const name of Object.keys(definitions) as (keyof Variables & string)[]) {
    const definition = definitions[name]!;
    if (hidden.has(definition)) continue;
    const value = variables.values[name];
    const variable = definition as AppVariable<any>;
    const group = definition.presentation?.group ?? 'scope';
    const prominence = definition.presentation?.prominence ?? 'primary';
    const labelPlacement =
      group === 'display'
        ? 'beside'
        : prominence === 'secondary'
          ? 'above'
          : 'inline';
    if (definition.kind === 'search') {
      searchControls.push(
        <ViewSearchField
          key={name}
          label={definition.label ?? name}
          primary={searchControls.length === 0}
          value={value as string}
          resetValue={definition.defaultValue}
          onChange={next =>
            variables.set(
              name,
              next as AppVariableValues<Variables>[typeof name]
            )
          }
        />
      );
      continue;
    }
    if (group === 'scope' && variable.clearValue !== undefined) {
      clearedFilters[name] = variable.clearValue;
      if (!variable.same(value, variable.clearValue)) hasActiveFilters = true;
    }
    function renderControl(
      labelPlacement: ControlLabelPlacement,
      onDeactivate?: () => void
    ) {
      function setControlValue(
        next: AppVariableValues<Variables>[typeof name]
      ) {
        variables.set(name, next);
        if (
          onDeactivate &&
          variable.same(next, variable.clearValue ?? variable.defaultValue)
        )
          onDeactivate();
      }
      let control: ReactNode = null;
      if (definition.kind === 'dateRange') {
        const selection = value as DateRangeSelection;
        control = (
          <DateRangePicker
            key={name}
            labelPlacement={
              labelPlacement === 'inline' ? undefined : labelPlacement
            }
            {...dateRangeControl(definition, selection, next =>
              setControlValue(next as AppVariableValues<Variables>[typeof name])
            )}
          />
        );
      } else if (definition.kind === 'dimension') {
        const filter = definition as DimensionVariable;
        const facet = facetState.get(name);
        control = (
          <DimensionPicker
            key={name}
            labelPlacement={labelPlacement}
            filter={filter}
            value={value as DimensionSelection}
            options={facet?.data ?? filter.options}
            loading={!!facet?.isPending}
            error={!!facet?.isError}
            onRetry={() => void facet?.refetch()}
            onChange={next =>
              setControlValue(next as AppVariableValues<Variables>[typeof name])
            }
          />
        );
      } else if (definition.kind === 'numberFilter') {
        control = (
          <NumberFilterPicker
            key={name}
            labelPlacement={labelPlacement}
            filter={definition as NumberFilter}
            value={value as NumberSelection}
            onChange={next =>
              setControlValue(next as AppVariableValues<Variables>[typeof name])
            }
          />
        );
      } else if (definition.kind === 'booleanFilter') {
        const selected = value as BooleanSelection;
        control = (
          <Select
            key={name}
            labelPlacement={labelPlacement}
            align={group === 'display' ? 'end' : 'start'}
            label={definition.label}
            value={selected.kind === 'all' ? 'all' : String(selected.value)}
            options={[
              { id: 'all', label: 'Any' },
              { id: 'true', label: 'Yes' },
              { id: 'false', label: 'No' },
            ]}
            onChange={next =>
              setControlValue(
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
        control = (
          <ChoicePicker
            key={name}
            labelPlacement={labelPlacement}
            selectionMode="multiple"
            label={definition.label ?? name}
            options={definition.options}
            values={value as readonly string[]}
            maxSelected={definition.maxSelected}
            emptySelectionLabel="None"
            onChange={next =>
              setControlValue(next as AppVariableValues<Variables>[typeof name])
            }
          />
        );
      } else if (definition.kind === 'choice') {
        control = (
          <Select
            key={name}
            labelPlacement={labelPlacement}
            align={group === 'display' ? 'end' : 'start'}
            label={definition.label ?? name}
            value={value as string}
            options={definition.options}
            onChange={next =>
              setControlValue(next as AppVariableValues<Variables>[typeof name])
            }
          />
        );
      }
      return control;
    }
    const baseline =
      group === 'display'
        ? variable.defaultValue
        : (variable.clearValue ?? variable.defaultValue);
    const active = !variable.same(value, baseline);
    if (group === 'display') {
      displayOptions[prominence].push(renderControl(labelPlacement));
      if (active) changedDisplayOptionCount++;
    } else {
      allFilters.push(renderControl('above'));
      if (active && prominence === 'secondary') {
        activeSecondaryFilters.push({
          id: name,
          label: definition.label ?? name,
          renderControl: onDeactivate => renderControl('inline', onDeactivate),
          onClear:
            variable.clearValue === undefined
              ? undefined
              : () => variables.set(name, variable.clearValue),
        });
      }
      if (prominence === 'primary')
        primaryFilters.push(renderControl('inline'));
      if (active) activeFilterCount++;
    }
  }
  const orderedDisplayOptions = [
    ...displayOptions.primary,
    ...displayOptions.secondary,
  ];
  const hasControls = allFilters.length > 0 || orderedDisplayOptions.length > 0;

  const controlBar: ViewControlBarProps = {
    primaryFilters,
    activeSecondaryFilters,
    allFilters,
    activeFilterCount,
    displayOptions: orderedDisplayOptions,
    changedDisplayOptionCount,
    onClear: hasActiveFilters
      ? () => variables.update(clearedFilters)
      : undefined,
  };
  return {
    ...variables,
    resolved,
    searchControls: searchControls.length ? searchControls : null,
    controlBar: hasControls || hasActiveFilters ? controlBar : undefined,
    filterControls:
      hasControls || hasActiveFilters ? (
        <ViewControlBar {...controlBar} />
      ) : null,
  };
}

function ViewSearchField({
  primary,
  ...props
}: SearchFieldProps & { primary: boolean }) {
  const suggestions = useContext(SearchSuggestionsContext);
  return suggestions && primary ? (
    <SearchTypeahead
      {...props}
      focusShortcut={primary}
      items={balanceSearchSuggestions(suggestions.groups, props.value)}
      busy={suggestions.busy}
    />
  ) : (
    <SearchField {...props} focusShortcut={primary} />
  );
}

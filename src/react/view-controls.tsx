import { facetSource, type FacetVariable } from '@/src/core/facets';
import {
  dimensionSource,
  type SourceDimensionVariable,
} from '@/src/core/dimension-source';
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
  type DimensionSelectionVariable,
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
    (entry): entry is [string, FacetVariable<any, any, string, unknown>] =>
      entry[1].kind === 'dimension' &&
      entry[1].optionsSource === 'query' &&
      facetSource in entry[1]
  );
  const sourceDimensions = Object.entries(definitions).filter(
    (entry): entry is [string, SourceDimensionVariable<any>] =>
      entry[1].kind === 'dimension' && dimensionSource in entry[1]
  );
  const optionSources = [
    ...facets.map(([name, filter]) => {
      const facet = filter[facetSource];
      return {
        name,
        filter,
        operation: facet.operation,
        input: facet.input({ ...resolved, [name]: { kind: 'all' } }),
      };
    }),
    ...sourceDimensions.map(([name, filter]) => ({
      name,
      filter,
      operation: filter[dimensionSource].operation,
      input: { member: null },
    })),
  ];
  const optionQueries = useQueries({
    queries: optionSources.map(({ name, filter, operation, input }) => {
      return {
        queryKey: ['dimension-facet', clientScope, name, operation, input],
        queryFn({ signal }: { signal: AbortSignal }) {
          return loadFacet(operation, input, signal).then(result =>
            parseFacetOptions(result, filter)
          );
        },
        staleTime: 60_000,
        gcTime: 300_000,
      };
    }),
  });
  const facetState = new Map(
    optionSources.map(({ name }, index) => [name, optionQueries[index]!])
  );
  const lookups = sourceDimensions.flatMap(([name, filter]) => {
    const value = resolved[name] as DimensionSelection;
    return value.kind !== 'all'
      ? value.members.flatMap(member =>
          member.kind === 'value' ? [{ name, filter, value: member.value }] : []
        )
      : [];
  });
  const lookupQueries = useQueries({
    queries: lookups.map(({ name, filter, value }) => ({
      queryKey: [
        'dimension-member',
        clientScope,
        name,
        filter[dimensionSource].operation,
        value,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        loadFacet(
          filter[dimensionSource].operation,
          { member: value },
          signal
        ).then(result => parseFacetOptions(result, filter)),
      staleTime: 60000,
      gcTime: 300000,
    })),
  });
  function dimensionState(
    name: string,
    filter: DimensionSelectionVariable<any>
  ) {
    const facet = facetState.get(name);
    const selected = lookups.flatMap((item, index) =>
      item.name === name ? [lookupQueries[index]!] : []
    );
    const options = [...(facet?.data ?? filter.options)];
    for (const lookup of selected)
      for (const option of lookup.data ?? []) {
        const index = options.findIndex(item => item.value === option.value);
        if (index < 0) options.push(option);
        else options[index] = option;
      }
    return {
      options,
      loading: !!facet?.isPending || selected.some(item => item.isPending),
      error: !!facet?.isError || selected.some(item => item.isError),
      retry: () => {
        void facet?.refetch();
        for (const lookup of selected) void lookup.refetch();
      },
    };
  }
  const primaryFilters: ReactNode[] = [];
  const displayOptions: { primary: ReactNode[]; secondary: ReactNode[] } = {
    primary: [],
    secondary: [],
  };
  const allFilters: ReactNode[] = [];
  const activeFilters: ActiveFilterControl[] = [];
  let activeFilterCount = 0;
  let changedDisplayOptionCount = 0;
  let hasActiveFilters = false;
  const clearedFilters: Partial<AppVariableValues<Variables>> = {};
  const searchControls: ReactNode[] = [];
  for (const name of Object.keys(definitions) as (keyof Variables & string)[]) {
    const definition = definitions[name]!;
    const value = variables.values[name];
    const variable = definition as AppVariable<any>;
    const widgetControl = definition.presentation?.control === 'widget';
    const group = definition.presentation?.group ?? 'scope';
    const prominence = definition.presentation?.prominence ?? 'primary';
    const labelPlacement =
      group === 'display'
        ? 'beside'
        : prominence === 'secondary'
          ? 'above'
          : 'inline';
    if (definition.kind === 'search') {
      if (widgetControl) continue;
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
      onClear?: () => void
    ) {
      function setControlValue(
        next: AppVariableValues<Variables>[typeof name]
      ) {
        variables.set(name, next);
        if (variable.same(next, baseline)) onClear?.();
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
        const filter = definition as DimensionSelectionVariable;
        const facet = dimensionState(name, filter);
        control = (
          <DimensionPicker
            key={name}
            labelPlacement={labelPlacement}
            filter={filter}
            value={value as DimensionSelection}
            options={facet.options}
            loading={facet.loading}
            error={facet.error}
            onRetry={facet.retry}
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
      if (widgetControl) continue;
      displayOptions[prominence].push(renderControl(labelPlacement));
      if (active) changedDisplayOptionCount++;
    } else {
      allFilters.push(renderControl('above'));
      if (active) {
        activeFilters.push({
          id: name,
          renderToolbarControl:
            !widgetControl && prominence === 'primary'
              ? undefined
              : onClear => renderControl('inline', onClear),
          onRemove: () =>
            variables.set(
              name,
              baseline as AppVariableValues<Variables>[typeof name]
            ),
          label: definition.label ?? name,
          summary:
            definition.kind === 'dimension'
              ? definition.describe(
                  value as DimensionSelection,
                  dimensionState(name, definition).options
                )
              : (variable.describe?.(value) ?? String(value)),
        });
      }
      if (!widgetControl && prominence === 'primary')
        primaryFilters.push(renderControl('inline'));
      if (active) activeFilterCount++;
    }
  }
  const orderedDisplayOptions = [
    ...displayOptions.primary,
    ...displayOptions.secondary,
  ];
  const hasControls = allFilters.length > 0 || orderedDisplayOptions.length > 0;

  return {
    ...variables,
    resolved,
    searchControls: searchControls.length ? searchControls : null,
    filterControls:
      hasControls || hasActiveFilters ? (
        <ViewControlBar
          primaryFilters={primaryFilters}
          activeFilters={activeFilters}
          allFilters={allFilters}
          activeFilterCount={activeFilterCount}
          displayOptions={orderedDisplayOptions}
          changedDisplayOptionCount={changedDisplayOptionCount}
          onClear={
            hasActiveFilters
              ? () => variables.update(clearedFilters)
              : undefined
          }
        />
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

import type {
  DateTimeRangeComparisonSelection,
  DateTimeRange,
} from '@altertable/data-app/contract';
import type {
  NumberFilter,
  NumberSelection,
  BooleanSelection,
} from '@altertable/data-app/contract';
import {
  parseFacetOptions,
  type DimensionSelection,
} from '@altertable/data-app/contract';
import {
  resolveFilterInput,
  type FilterInput,
} from '@altertable/data-app/internal';
import { facetSource, type FacetFilter } from '@altertable/data-app/internal';
import {
  dimensionSource,
  type SourceDimensionFilter,
} from '@altertable/data-app/internal';
import type { AppFilter } from '@altertable/data-app/internal';
import { type DimensionSelectionFilter } from '@altertable/data-app/internal';
import { useQueries } from '@tanstack/react-query';
import { useContext, useReducer, useState, type ReactNode } from 'react';

import {
  SearchSuggestionsContext,
  balanceSearchSuggestions,
} from './search-suggestions.ts';
import {
  dateRangeControl,
  useAppFilters,
  type FilterValues,
  type FilterCollection,
  type DateRangeSelection,
} from './ui/app-filters.ts';
import { ChoicePicker } from './ui/ChoicePicker.tsx';
import { DateRangePicker } from './ui/DateRangePicker.tsx';
import { DateTimeRangePicker } from './ui/DateTimeRangePicker.tsx';
import { DimensionPicker } from './ui/DimensionPicker.tsx';
import { NumberFilterPicker } from './ui/NumberFilterPicker.tsx';
import type { ControlLabelPlacement } from './ui/PickerField.tsx';
import { SearchField, type SearchFieldProps } from './ui/SearchField.tsx';
import { SearchTypeahead } from './ui/SearchTypeahead.tsx';
import { Select } from './ui/Select.tsx';
import {
  ViewControlBar,
  type ActiveFilterControl,
} from './view-control-bar.tsx';
import type { FilterControls } from './view-runtime.tsx';

/** A view's URL-backed filter values, resolved for its operation input. */
export function useFilterValues<Collection extends FilterCollection>(
  definitions: Collection
) {
  const filters = useAppFilters(definitions);
  const [referenceRevision, refreshReference] = useReducer(
    value => value + 1,
    0
  );
  const selectionKey = JSON.stringify(filters.values);
  const referenceKey = JSON.stringify([
    selectionKey,
    referenceRevision,
    filters.calendarRevision,
  ]);
  const [snapshot, setSnapshot] = useState(() => ({
    key: referenceKey,
    reference: new Date(),
  }));
  let reference = snapshot.reference;
  if (snapshot.key !== referenceKey) {
    // A new selection, refresh, or reporting day starts a new execution snapshot.
    // eslint-disable-next-line react/purity
    reference = new Date();
    setSnapshot({ key: referenceKey, reference });
  }
  const hasComparison = Object.values(definitions).some(
    variable => variable.kind === 'dateTimeRangeComparison'
  );
  const resolved: FilterInput<Collection> = resolveFilterInput(
    definitions,
    filters.values,
    reference
  );

  return {
    ...filters,
    resolved,
    /** Start a new reference time for relative ranges; false when none needs one. */
    refreshTime() {
      if (!hasComparison) return false;
      refreshReference();
      return true;
    },
  };
}

/** Controls for every declared filter. URL values resolve before facets; a facet's
 * options follow its operation's filters, which key its cached, bounded loading. */
export function useFilterControls<Collection extends FilterCollection>(
  definitions: Collection,
  operationFilters: Readonly<Record<string, FilterCollection>>,
  clientScope: string,
  loadFacet: (
    operation: string,
    input: unknown,
    signal: AbortSignal
  ) => Promise<unknown>
): FilterControls {
  const filters = useFilterValues(definitions);
  const resolved = filters.resolved;
  const facets = Object.entries(definitions).filter(
    (entry): entry is [string, FacetFilter<any, string>] =>
      entry[1].kind === 'dimension' &&
      entry[1].optionsSource === 'query' &&
      facetSource in entry[1]
  );
  const sourceDimensions = Object.entries(definitions).filter(
    (entry): entry is [string, SourceDimensionFilter<any>] =>
      entry[1].kind === 'dimension' && dimensionSource in entry[1]
  );
  const optionSources = [
    ...facets.map(([name, filter]) => {
      const operation = filter[facetSource].operation;
      // The options operation may read this facet too; it lists every member.
      const values: Record<string, unknown> = {
        ...resolved,
        [name]: { kind: 'all' },
      };
      return {
        name,
        filter,
        operation,
        input: Object.fromEntries(
          Object.keys(operationFilters[operation] ?? {}).map(key => [
            key,
            values[key],
          ])
        ),
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
  function dimensionState(name: string, filter: DimensionSelectionFilter<any>) {
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
  const clearedFilters: Partial<FilterValues<Collection>> = {};
  const searchControls: ReactNode[] = [];
  for (const name of Object.keys(definitions) as (keyof Collection &
    string)[]) {
    const definition = definitions[name]!;
    const value = filters.values[name];
    const variable = definition as AppFilter<any>;
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
            filters.set(name, next as FilterValues<Collection>[typeof name])
          }
        />
      );
      continue;
    }
    if (group === 'scope' && variable.clearValue !== undefined) {
      clearedFilters[name] = variable.clearValue;
      if (!variable.same(value, variable.clearValue)) hasActiveFilters = true;
    }
    const baseline =
      group === 'display'
        ? variable.defaultValue
        : (variable.clearValue ?? variable.defaultValue);
    const active = !variable.same(value, baseline);
    function renderControl(
      labelPlacement: ControlLabelPlacement,
      onClear?: () => void
    ) {
      function setControlValue(next: FilterValues<Collection>[typeof name]) {
        filters.set(name, next);
        if (onClear && variable.same(next, baseline)) onClear();
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
              setControlValue(next as FilterValues<Collection>[typeof name])
            )}
          />
        );
      } else if (definition.kind === 'dateTimeRangeComparison') {
        const selection = value as DateTimeRangeComparisonSelection;
        control = (
          <DateTimeRangePicker
            key={name}
            label={definition.label}
            labelPlacement={labelPlacement}
            value={selection.range}
            maxRangeDays={definition.maxRangeDays}
            presets={definition.presets}
            contract={definition.contract}
            comparison={{
              enabled: selection.comparison === 'previous',
              range: definition.previous(selection),
              onChange: enabled =>
                setControlValue({
                  range: selection.range,
                  ...(enabled ? { comparison: 'previous' } : {}),
                } as FilterValues<Collection>[typeof name]),
            }}
            onChange={range => {
              const next: DateTimeRangeComparisonSelection = {
                range,
                ...(selection.comparison && definition.previous({ range })
                  ? { comparison: 'previous' }
                  : {}),
              };
              setControlValue(next as FilterValues<Collection>[typeof name]);
            }}
          />
        );
      } else if (definition.kind === 'dateTimeRange') {
        control = (
          <DateTimeRangePicker
            key={name}
            label={definition.label}
            labelPlacement={labelPlacement}
            value={value as DateTimeRange}
            maxRangeDays={definition.maxRangeDays}
            presets={definition.presets}
            contract={definition.contract}
            onChange={next =>
              setControlValue(next as FilterValues<Collection>[typeof name])
            }
          />
        );
      } else if (definition.kind === 'dimension') {
        const filter = definition as DimensionSelectionFilter;
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
              setControlValue(next as FilterValues<Collection>[typeof name])
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
              setControlValue(next as FilterValues<Collection>[typeof name])
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
                    }) as FilterValues<Collection>[typeof name]
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
              setControlValue(next as FilterValues<Collection>[typeof name])
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
              setControlValue(next as FilterValues<Collection>[typeof name])
            }
          />
        );
      }
      return control;
    }
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
            filters.set(
              name,
              baseline as FilterValues<Collection>[typeof name]
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
            hasActiveFilters ? () => filters.update(clearedFilters) : undefined
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

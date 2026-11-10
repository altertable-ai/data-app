import {
  invariant,
  type DatePresetId,
  type DateRange,
  defineAppFilters,
  type AppFilter,
  type FilterValues,
  type DateRangeSelection,
  type DateRangeFilter,
  type HistoryMode,
  type FilterCollection,
} from '@altertable/data-app/internal';
import { today } from '@internationalized/date';
import { useEffect, useReducer, useSyncExternalStore } from 'react';

import { searchParams, subscribeSearch, writeSearch } from './search.ts';
export {
  type FilterValues,
  type DateRangeSelection,
  type DateRangeFilter,
  type FilterCollection,
} from '@altertable/data-app/internal';

/** Adapt one date filter to the controlled picker without giving the picker URL ownership. */
export function dateRangeControl(
  variable: DateRangeFilter,
  selection: DateRangeSelection,
  onChange: (selection: DateRangeSelection) => void
) {
  const value = variable.resolve(selection);

  function update(next: DateRangeSelection) {
    return onChange(
      selection.comparison && variable.previous(next)
        ? { ...next, comparison: 'previous' }
        : next
    );
  }

  return {
    value,
    label: variable.label,
    onChange(range: DateRange | null) {
      return update(
        range ? { kind: 'dates', ...range } : variable.defaultValue
      );
    },
    onPresetChange(id: DatePresetId) {
      return update({ kind: 'preset', id });
    },
    selectedPresetId: selection.kind === 'preset' ? selection.id : null,
    onReset() {
      return onChange(variable.defaultValue);
    },
    isDefault: variable.same(selection, variable.defaultValue),
    resetValue: variable.resolve(variable.defaultValue),
    ...(variable.supportsComparison
      ? {
          comparison: {
            enabled: selection.comparison === 'previous',
            range: variable.previous(selection),
            onChange(enabled: boolean) {
              return onChange(
                enabled
                  ? { ...selection, comparison: 'previous' }
                  : { ...selection, comparison: undefined }
              );
            },
          },
        }
      : {}),
    ...variable.bounds(),
  };
}

function currentSearch() {
  return searchParams().toString();
}

function serverSearch() {
  return '';
}

/** URL is the source of truth for app filters; one update can change dependent values atomically. */
export function useAppFilters<const Collection extends FilterCollection>(
  definitions: Collection
) {
  defineAppFilters(definitions);
  const search = useSyncExternalStore(
    subscribeSearch,
    currentSearch,
    serverSearch
  );
  const zones = Object.values(definitions).flatMap(item =>
    item.kind === 'dateRange'
      ? [item.bounds().timeZone]
      : (item.kind === 'dateTimeRange' ||
            item.kind === 'dateTimeRangeComparison') &&
          item.contract
        ? [item.contract.bounds().timeZone]
        : []
  );
  const zoneKey = [...new Set(zones)].sort().join('|');
  const [calendarRevision, bumpDay] = useReducer(value => value + 1, 0);

  useEffect(() => {
    if (!zoneKey) return;
    const timeZones = zoneKey.split('|');
    let day = timeZones.map(zone => today(zone).toString()).join('|');
    const timer = window.setInterval(() => {
      const next = timeZones.map(zone => today(zone).toString()).join('|');
      if (next !== day) {
        day = next;
        bumpDay();
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [zoneKey]);

  const params = new URLSearchParams(search);
  const values = {} as FilterValues<Collection>;
  const canonical: Record<string, string | null> = {};
  for (const name of Object.keys(definitions) as (keyof Collection &
    string)[]) {
    const variable = definitions[name] as unknown as AppFilter<
      FilterValues<Collection>[typeof name]
    >;
    const value = variable.read(params);
    values[name] = value;
    Object.assign(canonical, variable.write(value));
  }

  useEffect(() => {
    if (
      Object.entries(canonical).some(
        ([key, value]) => params.get(key) !== value
      )
    )
      writeSearch(canonical);
  });

  function update(
    next: Partial<FilterValues<Collection>>,
    history?: HistoryMode
  ) {
    const changes: Record<string, string | null> = {};
    let mode: HistoryMode = history ?? 'replace';
    for (const name of Object.keys(next) as (keyof Collection & string)[]) {
      const variable = definitions[name] as unknown as AppFilter<
        FilterValues<Collection>[typeof name]
      >;
      const value = next[name]!;
      invariant(variable.valid(value), `Invalid value for filter ${name}.`);
      Object.assign(changes, variable.write(value));
      if (!history && variable.history === 'push') mode = 'push';
    }
    writeSearch(changes, mode);
  }

  function set<Key extends keyof Collection & string>(
    name: Key,
    value: FilterValues<Collection>[Key]
  ) {
    update({ [name]: value } as Partial<FilterValues<Collection>>);
  }

  function reset<Key extends keyof Collection & string>(name: Key) {
    const variable = definitions[name] as unknown as AppFilter<
      FilterValues<Collection>[Key]
    >;
    set(name, variable.defaultValue);
  }

  function resetAll() {
    update(
      Object.fromEntries(
        Object.entries(definitions).map(([name, variable]) => [
          name,
          variable.defaultValue,
        ])
      ) as FilterValues<Collection>,
      'push'
    );
  }

  function clearAll() {
    update(
      Object.fromEntries(
        Object.entries(definitions)
          .filter(
            ([, variable]) =>
              variable.clearValue !== undefined &&
              variable.kind !== 'search' &&
              variable.presentation?.group !== 'display'
          )
          .map(([name, variable]) => [name, variable.clearValue])
      ) as Partial<FilterValues<Collection>>,
      'push'
    );
  }

  function bind<Key extends keyof Collection & string>(name: Key) {
    const variable = definitions[name] as unknown as AppFilter<
      FilterValues<Collection>[Key]
    >;

    return {
      value: values[name],
      onChange(value: FilterValues<Collection>[Key]) {
        return set(name, value);
      },
      resetValue: variable.defaultValue,
    };
  }

  return {
    values,
    calendarRevision,
    set,
    reset,
    resetAll,
    clearAll,
    update,
    bind,
  };
}

export {
  dateTimeRangeFilter,
  dateTimeRangePresets,
  type DateTimeRangePreset,
  type DateTimeRangeFilter,
  type DateTimeRangeComparisonFilter,
  type DateTimeRangeComparisonFilterOptions,
  type DateTimeRangeComparisonSelection,
  type DateTimeRangeComparisonRequest,
  type DateTimeRangeFilterOptions,
} from '@altertable/data-app/internal';

import {
  invariant,
  defineAppFilters,
  type AppFilter,
  type FilterValues,
  type HistoryMode,
  type FilterCollection,
} from '@altertable/data-app/internal';
import { today } from '@internationalized/date';
import { useEffect, useReducer, useSyncExternalStore } from 'react';

import { searchParams, subscribeSearch, writeSearch } from './search.ts';
export {
  type FilterValues,
  type FilterCollection,
} from '@altertable/data-app/internal';

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
    (item.kind === 'dateTimeRange' ||
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
    const filter = definitions[name] as unknown as AppFilter<
      FilterValues<Collection>[typeof name]
    >;
    const value = filter.read(params);
    values[name] = value;
    Object.assign(canonical, filter.write(value));
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
      const filter = definitions[name] as unknown as AppFilter<
        FilterValues<Collection>[typeof name]
      >;
      const value = next[name]!;
      invariant(filter.valid(value), `Invalid value for filter ${name}.`);
      Object.assign(changes, filter.write(value));
      if (!history && filter.history === 'push') mode = 'push';
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
    const filter = definitions[name] as unknown as AppFilter<
      FilterValues<Collection>[Key]
    >;
    set(name, filter.defaultValue);
  }

  function resetAll() {
    update(
      Object.fromEntries(
        Object.entries(definitions).map(([name, filter]) => [
          name,
          filter.defaultValue,
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
            ([, filter]) =>
              filter.clearValue !== undefined &&
              filter.kind !== 'search' &&
              filter.presentation?.group !== 'display'
          )
          .map(([name, filter]) => [name, filter.clearValue])
      ) as Partial<FilterValues<Collection>>,
      'push'
    );
  }

  function bind<Key extends keyof Collection & string>(name: Key) {
    const filter = definitions[name] as unknown as AppFilter<
      FilterValues<Collection>[Key]
    >;

    return {
      value: values[name],
      onChange(value: FilterValues<Collection>[Key]) {
        return set(name, value);
      },
      resetValue: filter.defaultValue,
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

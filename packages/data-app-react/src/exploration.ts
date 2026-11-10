import type { DateTimeRangeRequest } from '@altertable/data-app/internal';
import type {
  AppFilter,
  FilterValues,
  FilterCollection,
} from '@altertable/data-app/internal';
import type { ChoiceFilter } from '@altertable/data-app/internal';
import { invariant } from '@altertable/data-app/internal';

import { searchParams, writeSearch } from './ui/search.ts';

declare const filterPatch: unique symbol;
declare const breakdownValue: unique symbol;

export class FilterTarget<Patch> {
  declare readonly [filterPatch]: Patch;
}
export class BreakdownTarget<Value extends string> {
  declare readonly [breakdownValue]: Value;
}
export type FilterPatch<Collection extends FilterCollection> = Partial<{
  [Key in keyof Collection]: Extract<
    Collection[Key]['presentation'],
    { group: 'display' }
  > extends never
    ? FilterValues<Collection>[Key]
    : never;
}>;
/** A view's filters; its operation input has one field per filter. */
type TargetDefinition = {
  owner: object;
  filters: FilterCollection;
  key?: string;
};
const targets = new WeakMap<object, TargetDefinition>();
export function createFilterTarget<Collection extends FilterCollection>(
  definition: TargetDefinition
): FilterTarget<FilterPatch<Collection>> {
  const target = new FilterTarget<FilterPatch<Collection>>();
  targets.set(target, definition);
  return target;
}
export function createBreakdownTarget<Value extends string>(
  definition: TargetDefinition
): BreakdownTarget<Value> {
  const filter = definition.filters[definition.key!];
  invariant(
    filter?.kind === 'choice' && filter.presentation?.group === 'display',
    'Choose a displayChoice() filter.'
  );
  const target = new BreakdownTarget<Value>();
  targets.set(target, definition);
  return target;
}
function breakdownDefinition(target: BreakdownTarget<any>) {
  const definition = targets.get(target);
  invariant(definition, 'Invalid breakdown target.');
  return definition;
}
function readInput(key: string, input: unknown) {
  return (input as Record<string, unknown>)[key];
}
function appliedValues(definition: TargetDefinition) {
  const params = searchParams();
  return Object.fromEntries(
    Object.entries(definition.filters).map(([name, filter]) => [
      name,
      filter.read(params),
    ])
  );
}
function commit(definition: TargetDefinition, values: Record<string, unknown>) {
  const changes = Object.assign(
    {},
    ...Object.entries(definition.filters).map(([name, filter]) =>
      (filter as AppFilter<any>).write(values[name])
    )
  );
  writeSearch(changes, 'push');
}
export function targetAvailable(
  target: object,
  displayedInput: unknown,
  owner: object
): boolean {
  const definition = targets.get(target);
  invariant(
    definition && definition.owner === owner,
    'Exploration targets must belong to the dataset view.'
  );
  const applied = appliedValues(definition);
  return Object.entries(definition.filters).every(([key, filter]) => {
    if (filter.presentation?.group === 'display') {
      if (!(target instanceof BreakdownTarget && key === definition.key))
        return true;
    }
    const shown = readInput(key, displayedInput);
    if (filter.kind === 'dateTimeRange')
      return (
        !!shown &&
        filter.same(
          applied[key] as never,
          (shown as DateTimeRangeRequest).selection
        )
      );
    return (filter as AppFilter<any>).same(applied[key], shown);
  });
}
/** Apply an explicit scope patch and optional chart choice in one history entry. */
export function applyFilter(
  target: object,
  patch: Record<string, unknown>,
  breakdown?: { target: BreakdownTarget<any>; value: string }
) {
  const definition = targets.get(target)!;
  const values = appliedValues(definition);
  for (const [key, value] of Object.entries(patch)) {
    const filter = definition.filters[key];
    invariant(
      filter &&
        filter.presentation?.group !== 'display' &&
        (filter as AppFilter<any>).valid(value),
      'Filter actions can only update scope filters.'
    );
  }
  if (breakdown) {
    const choice = breakdownDefinition(breakdown.target);
    invariant(
      choice.owner === definition.owner,
      'Breakdown must belong to the filter view.'
    );
    const filter = choice.filters[choice.key!]!;
    invariant(
      (filter as AppFilter<any>).valid(breakdown.value),
      'Invalid breakdown.'
    );
    patch = { ...patch, [choice.key!]: breakdown.value };
  }
  commit(definition, { ...values, ...patch });
}
export function breakdownState(
  target: BreakdownTarget<any>,
  owner: object | undefined,
  input?: unknown
) {
  const definition = breakdownDefinition(target);
  invariant(
    definition.owner === owner,
    'Breakdown targets must belong to the dataset view.'
  );
  const filter = definition.filters[definition.key!] as ChoiceFilter;
  const values = appliedValues(definition);
  const value = (
    input === undefined
      ? values[definition.key!]
      : readInput(definition.key!, input)
  ) as string;
  return {
    filter,
    value,
    options: filter.options,
    set(id: string) {
      invariant(filter.valid(id), 'Invalid breakdown.');
      commit(definition, { ...values, [definition.key!]: id });
    },
  };
}

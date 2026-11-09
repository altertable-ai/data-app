import type {
  DateTimeRangeComparisonRequest,
  DateRangeRequest,
} from '@altertable/data-app/contract';
import type {
  AppFilter,
  FilterValues,
  FilterCollection,
} from '@altertable/data-app/internal';
import type { ChoiceFilter } from '@altertable/data-app/internal';
import { invariant } from '@altertable/data-app/internal';

import { searchParams, writeSearch } from './ui/search.ts';
import { resolveViewInput, type ViewBindings } from './view.ts';

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
type TargetDefinition = {
  owner: object;
  filters: FilterCollection;
  input: (values: any) => unknown;
  bindings?: ViewBindings<any, any>;
  date?: {
    filter: string;
    input: (input: any) => DateRangeRequest | DateTimeRangeComparisonRequest;
  };
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
  const variable = definition.filters[definition.key!];
  invariant(
    variable?.kind === 'choice' && variable.presentation?.group === 'display',
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
function readInput(definition: TargetDefinition, key: string, input: unknown) {
  return (
    definition.bindings?.[key]?.(input) ??
    (definition.date?.filter === key
      ? definition.date.input(input)
      : undefined) ??
    (input as Record<string, unknown>)?.[key]
  );
}
function appliedValues(definition: TargetDefinition) {
  const params = searchParams();
  return Object.fromEntries(
    Object.entries(definition.filters).map(([name, variable]) => [
      name,
      variable.read(params),
    ])
  );
}
function commit(definition: TargetDefinition, values: Record<string, unknown>) {
  // Apply the same preservation checks as the view before mutating its route.
  const resolved = Object.fromEntries(
    Object.entries(definition.filters).map(([name, variable]) => [
      name,
      variable.kind === 'dateRange' ||
      variable.kind === 'dateTimeRangeComparison'
        ? variable.input(values[name] as never)
        : values[name],
    ])
  );
  resolveViewInput<any, unknown>(definition, resolved);
  const changes = Object.assign(
    {},
    ...Object.entries(definition.filters).map(([name, variable]) =>
      (variable as AppFilter<any>).write(values[name])
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
  return Object.entries(definition.filters).every(([key, variable]) => {
    if (variable.presentation?.group === 'display') {
      if (!(target instanceof BreakdownTarget && key === definition.key))
        return true;
    }
    const shown = readInput(definition, key, displayedInput);
    if (variable.kind === 'dateTimeRangeComparison')
      return (
        !!shown &&
        variable.same(
          applied[key] as never,
          (shown as DateTimeRangeComparisonRequest).selection
        )
      );
    return variable.kind === 'dateRange'
      ? JSON.stringify(variable.input(applied[key] as never)) ===
          JSON.stringify(shown)
      : (variable as AppFilter<any>).same(applied[key], shown);
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
    const variable = definition.filters[key];
    invariant(
      variable &&
        variable.presentation?.group !== 'display' &&
        (variable as AppFilter<any>).valid(value),
      'Filter actions can only update scope filters.'
    );
  }
  if (breakdown) {
    const choice = breakdownDefinition(breakdown.target);
    invariant(
      choice.owner === definition.owner,
      'Breakdown must belong to the filter view.'
    );
    const variable = choice.filters[choice.key!]!;
    invariant(
      (variable as AppFilter<any>).valid(breakdown.value),
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
  const variable = definition.filters[definition.key!] as ChoiceFilter;
  const values = appliedValues(definition);
  const value = (
    input === undefined
      ? values[definition.key!]
      : readInput(definition, definition.key!, input)
  ) as string;
  return {
    variable,
    value,
    options: variable.options,
    set(id: string) {
      invariant(variable.valid(id), 'Invalid breakdown.');
      commit(definition, { ...values, [definition.key!]: id });
    },
  };
}

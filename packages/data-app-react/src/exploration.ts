import type { DateRangeRequest } from '@altertable/data-app/contract';
import type {
  AppVariable,
  AppVariableValues,
  VariableCollection,
} from '@altertable/data-app/internal';
import type { ChoiceVariable } from '@altertable/data-app/internal';
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
export type FilterPatch<Variables extends VariableCollection> = Partial<{
  [Key in keyof Variables]: Extract<
    Variables[Key]['presentation'],
    { group: 'display' }
  > extends never
    ? AppVariableValues<Variables>[Key]
    : never;
}>;
type TargetDefinition = {
  owner: object;
  variables: VariableCollection;
  input: (values: any) => unknown;
  bindings?: ViewBindings<any, any>;
  date?: { variable: string; input: (input: any) => DateRangeRequest };
  key?: string;
};
const targets = new WeakMap<object, TargetDefinition>();
export function createFilterTarget<Variables extends VariableCollection>(
  definition: TargetDefinition
): FilterTarget<FilterPatch<Variables>> {
  const target = new FilterTarget<FilterPatch<Variables>>();
  targets.set(target, definition);
  return target;
}
export function createBreakdownTarget<Value extends string>(
  definition: TargetDefinition
): BreakdownTarget<Value> {
  const variable = definition.variables[definition.key!];
  invariant(
    variable?.kind === 'choice' && variable.presentation?.group === 'display',
    'Choose a display choice variable.'
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
    (definition.date?.variable === key
      ? definition.date.input(input)
      : undefined) ??
    (input as Record<string, unknown>)?.[key]
  );
}
function appliedValues(definition: TargetDefinition) {
  const params = searchParams();
  return Object.fromEntries(
    Object.entries(definition.variables).map(([name, variable]) => [
      name,
      variable.read(params),
    ])
  );
}
function commit(definition: TargetDefinition, values: Record<string, unknown>) {
  // Apply the same preservation checks as the view before mutating its route.
  const resolved = Object.fromEntries(
    Object.entries(definition.variables).map(([name, variable]) => [
      name,
      variable.kind === 'dateRange'
        ? variable.input(values[name] as never)
        : values[name],
    ])
  );
  resolveViewInput<any, unknown>(definition, resolved);
  const changes = Object.assign(
    {},
    ...Object.entries(definition.variables).map(([name, variable]) =>
      (variable as AppVariable<any>).write(values[name])
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
  return Object.entries(definition.variables).every(([key, variable]) => {
    if (variable.presentation?.group === 'display') {
      if (!(target instanceof BreakdownTarget && key === definition.key))
        return true;
    }
    const shown = readInput(definition, key, displayedInput);
    return variable.kind === 'dateRange'
      ? JSON.stringify(variable.input(applied[key] as never)) ===
          JSON.stringify(shown)
      : (variable as AppVariable<any>).same(applied[key], shown);
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
    const variable = definition.variables[key];
    invariant(
      variable &&
        variable.presentation?.group !== 'display' &&
        (variable as AppVariable<any>).valid(value),
      'Filter actions can only update scope variables.'
    );
  }
  if (breakdown) {
    const choice = breakdownDefinition(breakdown.target);
    invariant(
      choice.owner === definition.owner,
      'Breakdown must belong to the filter view.'
    );
    const variable = choice.variables[choice.key!]!;
    invariant(
      (variable as AppVariable<any>).valid(breakdown.value),
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
  const variable = definition.variables[definition.key!] as ChoiceVariable;
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

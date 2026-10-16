import type { DateRangeRequest } from '@/src/core/contract';
import type {
  AppVariable,
  AppVariableValues,
  VariableCollection,
} from '@/src/core/variables';
import type { ChoiceVariable } from '@/src/core/variables';
import { invariant } from '@/src/core/invariant';
import { resolveViewInput, type ViewBindings } from '@/src/react/view';
import { searchParams, writeSearch } from '@/src/react/ui/search';

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
  const target = new BreakdownTarget<Value>();
  targets.set(target, definition);
  return target;
}
export function breakdownDefinition(target: BreakdownTarget<any>) {
  // Breakdown targets are only created, and registered, by createBreakdownTarget.
  return targets.get(target)!;
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
/** Whether the view's input mapper preserves these values, as the view requires. */
function preserved(
  definition: TargetDefinition,
  values: Record<string, unknown>
): boolean {
  const resolved = Object.fromEntries(
    Object.entries(definition.variables).map(([name, variable]) => [
      name,
      variable.kind === 'dateRange'
        ? variable.input(values[name] as never)
        : values[name],
    ])
  );
  return !resolveViewInput<any, unknown>(definition, resolved).problem;
}
function commit(definition: TargetDefinition, values: Record<string, unknown>) {
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
  // oxlint-disable-next-line data-app/no-runtime-assertion -- Ownership is object identity; same-shaped views share a type.
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
/** The values a filter action would commit, or undefined when the row's values cannot be
 * applied: they are not valid scope values, or the view could not represent them. */
function filterValues(
  target: object,
  patch: Record<string, unknown>,
  breakdown?: { target: BreakdownTarget<any>; value: string }
): Record<string, unknown> | undefined {
  const definition = targets.get(target)!;
  const scoped = Object.entries(patch).every(([key, value]) => {
    const variable = definition.variables[key];
    return (
      variable &&
      variable.presentation?.group !== 'display' &&
      (variable as AppVariable<any>).valid(value)
    );
  });
  if (!scoped) return undefined;
  let values = { ...appliedValues(definition), ...patch };
  if (breakdown) {
    const choice = breakdownDefinition(breakdown.target);
    // oxlint-disable-next-line data-app/no-runtime-assertion -- Ownership is object identity; same-shaped views share a type.
    invariant(
      choice.owner === definition.owner,
      'Breakdown must belong to the filter view.'
    );
    const variable = choice.variables[choice.key!] as AppVariable<any>;
    if (!variable.valid(breakdown.value)) return undefined;
    values = { ...values, [choice.key!]: breakdown.value };
  }
  return preserved(definition, values) ? values : undefined;
}
/** Whether a row's filter action can be offered; invalid row values hide the action. */
export function filterApplicable(
  target: object,
  patch: Record<string, unknown>,
  breakdown?: { target: BreakdownTarget<any>; value: string }
): boolean {
  return !!filterValues(target, patch, breakdown);
}
/** Apply an explicit scope patch and optional chart choice in one history entry. */
export function applyFilter(
  target: object,
  patch: Record<string, unknown>,
  breakdown?: { target: BreakdownTarget<any>; value: string }
) {
  const values = filterValues(target, patch, breakdown);
  if (values) commit(targets.get(target)!, values);
}
export function breakdownState(
  target: BreakdownTarget<any>,
  owner: object | undefined,
  input?: unknown
) {
  const definition = breakdownDefinition(target);
  // oxlint-disable-next-line data-app/no-runtime-assertion -- Ownership is object identity; same-shaped views share a type.
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
      const next = { ...values, [definition.key!]: id };
      // Choices come from the variable's own options; skip anything the view cannot show.
      if (variable.valid(id) && preserved(definition, next))
        commit(definition, next);
    },
  };
}

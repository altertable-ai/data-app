import type { DateRangeRequest } from '@/src/core/contract';
import type {
  AppVariable,
  AppVariableValues,
  VariableCollection,
} from '@/src/core/variables';
import { normalizeVariableValues } from '@/src/core/variables';
import {
  selectedMember,
  type HierarchyVariable,
  type HierarchyLevel,
  type HierarchyPatch,
  type BreakdownVariable,
} from '@/src/core/hierarchy';
import { invariant } from '@/src/core/invariant';
import { resolveViewInput, type ViewBindings } from '@/src/react/view';
import { searchParams, writeSearch } from '@/src/react/ui/search';

export class FilterTarget<Patch> {
  declare private patch: Patch;
}
export class HierarchyTarget<Levels extends readonly HierarchyLevel[]> {
  declare private levels: Levels;
}
export class BreakdownTarget<Levels extends readonly HierarchyLevel[]> {
  declare private levels: Levels;
}
export type OrdinaryScope<Variables extends VariableCollection> = Partial<{
  [
    Key in keyof Variables as Variables[Key] extends {
      kind: 'hierarchy' | 'breakdown';
    }
      ? never
      : Extract<
            Variables[Key]['presentation'],
            { group: 'display' }
          > extends never
        ? Key
        : never
  ]: AppVariableValues<Variables>[Key];
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
): FilterTarget<OrdinaryScope<Variables>> {
  const target = new FilterTarget<OrdinaryScope<Variables>>();
  targets.set(target, definition);
  return target;
}
export function createHierarchyTarget<Levels extends readonly HierarchyLevel[]>(
  definition: TargetDefinition
): HierarchyTarget<Levels> {
  invariant(
    definition.variables[definition.key!]?.kind === 'hierarchy',
    'Choose a hierarchy variable.'
  );
  const target = new HierarchyTarget<Levels>();
  targets.set(target, definition);
  return target;
}
export function createBreakdownTarget<Levels extends readonly HierarchyLevel[]>(
  definition: TargetDefinition
): BreakdownTarget<Levels> {
  invariant(
    definition.variables[definition.key!]?.kind === 'breakdown',
    'Choose a breakdown variable.'
  );
  const target = new BreakdownTarget<Levels>();
  targets.set(target, definition);
  return target;
}
export function breakdownDefinition(target: BreakdownTarget<any>) {
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
  return normalizeVariableValues(
    definition.variables,
    Object.fromEntries(
      Object.entries(definition.variables).map(([name, variable]) => [
        name,
        variable.read(params),
      ])
    )
  );
}
function commit(definition: TargetDefinition, values: Record<string, unknown>) {
  const normalized = normalizeVariableValues(definition.variables, values);
  // Apply the same preservation checks as the view before mutating its route.
  const resolved = Object.fromEntries(
    Object.entries(definition.variables).map(([name, variable]) => [
      name,
      variable.kind === 'dateRange'
        ? variable.input(normalized[name] as never)
        : normalized[name],
    ])
  );
  resolveViewInput<any, unknown>(definition, resolved);
  const changes = Object.assign(
    {},
    ...Object.entries(definition.variables).map(([name, variable]) =>
      (variable as AppVariable<any>).write(normalized[name])
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
    if (
      variable.presentation?.group === 'display' ||
      variable.kind === 'breakdown'
    ) {
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
export function applyFilter(target: object, patch: Record<string, unknown>) {
  const definition = targets.get(target)!;
  const values = appliedValues(definition);
  for (const [key, value] of Object.entries(patch)) {
    const variable = definition.variables[key];
    invariant(
      variable &&
        !['hierarchy', 'breakdown'].includes(variable.kind) &&
        variable.presentation?.group !== 'display' &&
        (variable as AppVariable<any>).valid(value),
      'Filter actions can only update ordinary scope variables.'
    );
  }
  commit(definition, { ...values, ...patch });
}
export function applyHierarchy(
  target: object,
  patch: HierarchyPatch<readonly HierarchyLevel[]>
) {
  const definition = targets.get(target)!;
  const hierarchy = definition.variables[definition.key!] as HierarchyVariable;
  const values = appliedValues(definition);
  commit(definition, {
    ...values,
    [definition.key!]: hierarchy.transition(
      values[definition.key!] as never,
      patch
    ),
  });
}
export function canDescend(target: BreakdownTarget<any>, input: unknown) {
  const definition = targets.get(target)!;
  const breakdown = definition.variables[definition.key!] as BreakdownVariable;
  const hierarchyName = Object.keys(definition.variables).find(
    key => definition.variables[key] === breakdown.hierarchy
  )!;
  const scope = readInput(definition, hierarchyName, input) as never;
  const current = breakdown.level(
    readInput(definition, definition.key!, input) as string,
    scope
  );
  const index = breakdown.hierarchy.levels.findIndex(
    level => level.id === current.id
  );
  return (
    index < breakdown.hierarchy.levels.length - 1 &&
    breakdown.hierarchy.levels
      .slice(0, index)
      .every(level => selectedMember(scope, level.id) !== null)
  );
}
export function descend(target: BreakdownTarget<any>, member: string | number) {
  const definition = targets.get(target)!;
  const breakdown = definition.variables[definition.key!] as BreakdownVariable;
  const values = appliedValues(definition);
  const hierarchyName = Object.keys(definition.variables).find(
    key => definition.variables[key] === breakdown.hierarchy
  )!;
  const scope = values[hierarchyName] as never;
  const current = breakdown.level(values[definition.key!] as string, scope);
  const next =
    breakdown.hierarchy.levels[
      breakdown.hierarchy.levels.findIndex(level => level.id === current.id) + 1
    ];
  invariant(next, 'The last hierarchy level cannot descend.');
  commit(definition, {
    ...values,
    [hierarchyName]: breakdown.hierarchy.transition(scope, {
      [current.id]: member,
    }),
    [definition.key!]: next.id,
  });
}
export function breakdownState(target: BreakdownTarget<any>, input?: unknown) {
  const definition = breakdownDefinition(target);
  const variable = definition.variables[definition.key!] as BreakdownVariable;
  const values = appliedValues(definition);
  const hierarchyKey = Object.keys(definition.variables).find(
    key => definition.variables[key] === variable.hierarchy
  )!;
  const scope = (
    input === undefined
      ? values[hierarchyKey]
      : readInput(definition, hierarchyKey, input)
  ) as never;
  const value = (
    input === undefined
      ? values[definition.key!]
      : readInput(definition, definition.key!, input)
  ) as string;
  return {
    variable,
    level: variable.level(value, scope),
    options: variable.options(scope),
    set(id: string) {
      invariant(
        variable.options(scope).some(level => level.id === id),
        'Invalid breakdown.'
      );
      commit(definition, { ...values, [definition.key!]: id });
    },
  };
}

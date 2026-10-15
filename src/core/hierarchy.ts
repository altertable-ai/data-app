import type { AppVariable, HistoryMode } from '@/src/core/variables';
import type { DimensionOption } from '@/src/core/dimension';
import {
  resolveQueryParameters,
  type QueryDefinitions,
  type QueryParameters,
} from '@/src/core/queries';
import type {
  DataOperation,
  DataOperations,
  QueryResult,
} from '@/src/core/operation-types';
import { invariant } from '@/src/core/invariant';

export type HierarchySelection<Value extends string | number> =
  | { kind: 'all' }
  | { kind: 'include'; members: readonly [{ kind: 'value'; value: Value }] };
export type HierarchyLevel = {
  id: string;
  label: string;
  valueType: 'string' | 'number';
  options?: readonly (DimensionOption & { parent?: string | number })[];
  source?: { query: string; parents?: Readonly<Record<string, string>> };
};
type LevelValue<Level extends HierarchyLevel> = {
  string: string;
  number: number;
}[Level['valueType']];
export type HierarchyScope<Levels extends readonly HierarchyLevel[]> = {
  selection: {
    [Level in Levels[number] as Level['id']]: HierarchySelection<
      LevelValue<Level>
    >;
  };
};
export type HierarchyPatch<Levels extends readonly HierarchyLevel[]> = {
  [Level in Levels[number] as Level['id']]?: LevelValue<Level> | null;
};
export type BreakdownVariable<
  Levels extends readonly HierarchyLevel[] = readonly HierarchyLevel[],
> = AppVariable<Levels[number]['id'], 'breakdown'> & {
  hierarchy: HierarchyVariable<Levels>;
  level(
    value: Levels[number]['id'],
    scope: HierarchyScope<Levels>
  ): Levels[number];
  options(scope: HierarchyScope<Levels>): readonly Levels[number][];
};
export type HierarchyVariable<
  Levels extends readonly HierarchyLevel[] = readonly HierarchyLevel[],
  Key extends string = string,
> = AppVariable<HierarchyScope<Levels>, 'hierarchy'> & {
  key: Key;
  label: string;
  levels: Levels;
  parse(value: unknown): HierarchyScope<Levels>;
  transition(
    scope: HierarchyScope<Levels>,
    values: HierarchyPatch<Levels>
  ): HierarchyScope<Levels>;
  breakdown(config: {
    key: string;
    label?: string;
    history?: HistoryMode;
  }): BreakdownVariable<Levels>;
  input<
    Input,
    const Breakdowns extends Record<string, BreakdownVariable<Levels>> = {},
  >(
    parse: (value: unknown) => Input,
    options: {
      breakdowns?: Breakdowns;
      binding: (input: Input) => HierarchyScope<Levels>;
    }
  ): (
    value: unknown
  ) => Input & { [Name in keyof Breakdowns]: Levels[number]['id'] };
  input<
    Input,
    const Breakdowns extends Record<string, BreakdownVariable<Levels>> = {},
  >(
    parse: (value: unknown) => Input,
    options?: { breakdowns?: Breakdowns; binding?: never }
  ): (value: unknown) => Input & { [Name in Key]: HierarchyScope<Levels> } & {
    [Name in keyof Breakdowns]: Levels[number]['id'];
  };
};

export function selectedMember(
  scope: HierarchyScope<readonly HierarchyLevel[]>,
  id: string
): string | number | null {
  const selection = scope.selection[id];
  return selection?.kind === 'include' ? selection.members[0].value : null;
}

/** Hierarchies own only population selections; each chart declares its own breakdown. */
export function hierarchyVariable<
  const Levels extends readonly (HierarchyLevel & {
    source?: never;
    options: NonNullable<HierarchyLevel['options']>;
  })[],
  const Key extends string,
>(config: {
  key: Key;
  label: string;
  levels: Levels & (Levels extends readonly [] ? never : unknown);
  history?: HistoryMode;
}): HierarchyVariable<Levels, Key> {
  invariant(
    config.levels.every(level => !level.source),
    'Static hierarchies require options; use app.defineHierarchy for sources.'
  );
  return createHierarchy<Levels, Key>(config);
}

function createHierarchy<
  const Levels extends readonly HierarchyLevel[],
  const Key extends string,
>(config: {
  key: Key;
  label: string;
  levels: Levels & (Levels extends readonly [] ? never : unknown);
  history?: HistoryMode;
}): HierarchyVariable<Levels, Key> {
  const { key, label, levels } = config;
  invariant(
    key.length > 0 &&
      levels.length > 0 &&
      new Set(levels.map(level => level.id)).size === levels.length,
    'A hierarchy needs a key and unique levels.'
  );
  for (const [index, level] of levels.entries()) {
    invariant(
      !!level.id && !!level.label && !!level.options !== !!level.source,
      'Each hierarchy level needs options or a source.'
    );
    const options = level.options ?? [];
    invariant(
      options.every(
        option =>
          typeof option.value === level.valueType &&
          (typeof option.value !== 'number' || Number.isFinite(option.value)) &&
          !!option.label.trim() &&
          (index === 0 ||
            typeof option.parent === levels[index - 1]!.valueType) &&
          (option.count === undefined ||
            (Number.isSafeInteger(option.count) && option.count >= 0))
      ),
      'Hierarchy options need typed values, labels, and an immediate parent for child levels.'
    );
    invariant(
      new Set(
        options.map(option => JSON.stringify([option.parent, option.value]))
      ).size === options.length,
      'Duplicate hierarchy option.'
    );
    if (index > 0 && levels[index - 1]!.options) {
      invariant(
        options.every(option =>
          levels[index - 1]!.options!.some(
            parent => parent.value === option.parent
          )
        ),
        'Unknown static hierarchy parent.'
      );
    }
  }
  const empty = {
    selection: Object.fromEntries(
      levels.map(level => [level.id, { kind: 'all' }])
    ),
  } as HierarchyScope<Levels>;
  function valid(value: HierarchyScope<Levels>) {
    if (
      !value ||
      typeof value !== 'object' ||
      !value.selection ||
      typeof value.selection !== 'object' ||
      Array.isArray(value.selection)
    )
      return false;
    if (Object.keys(value.selection).length !== levels.length) return false;
    let parent: string | number | null = null;
    for (const [index, level] of levels.entries()) {
      const selection = (
        value.selection as Record<string, HierarchySelection<string | number>>
      )[level.id];
      if (!selection || typeof selection !== 'object') return false;
      if (selection.kind === 'all') {
        parent = null;
        continue;
      }
      if (
        selection.kind !== 'include' ||
        !Array.isArray(selection.members) ||
        selection.members.length !== 1 ||
        (index > 0 && parent === null)
      )
        return false;
      const member = selection.members[0];
      if (
        !member ||
        member.kind !== 'value' ||
        typeof member.value !== level.valueType ||
        (typeof member.value === 'number' && !Number.isFinite(member.value)) ||
        (typeof member.value === 'string' && member.value.length > 1000)
      )
        return false;
      if (
        level.options &&
        !level.options.some(
          option =>
            option.value === member.value &&
            (index === 0 || option.parent === parent)
        )
      )
        return false;
      parent = member.value;
    }
    return true;
  }
  const hierarchy: HierarchyVariable<Levels, Key> = {
    kind: 'hierarchy',
    key,
    label,
    levels,
    presentation: { prominence: 'secondary' },
    urlKeys: [key],
    defaultValue: empty,
    clearValue: empty,
    history: config.history ?? 'push',
    valid,
    same: (left, right) =>
      levels.every(
        level =>
          selectedMember(left, level.id) === selectedMember(right, level.id)
      ),
    parse(value) {
      invariant(
        valid(value as HierarchyScope<Levels>),
        `Invalid ${label} selection.`
      );
      return value as HierarchyScope<Levels>;
    },
    read(params) {
      const raw = params.get(key);
      if (!raw || raw.length > 16_384) return empty;
      try {
        const value = JSON.parse(raw);
        return valid(value) ? value : empty;
      } catch {
        return empty;
      }
    },
    write(value) {
      return {
        [key]: hierarchy.same(value, empty) ? null : JSON.stringify(value),
      };
    },
    describe(scope) {
      return (
        levels
          .flatMap((level, index) => {
            const member = selectedMember(scope, level.id);
            if (member === null) return [];
            const parent =
              index > 0 ? selectedMember(scope, levels[index - 1]!.id) : null;
            return [
              level.options?.find(
                option =>
                  option.value === member &&
                  (index === 0 || option.parent === parent)
              )?.label ?? String(member),
            ];
          })
          .join(' / ') || `All ${label.toLowerCase()}`
      );
    },
    transition(scope, patch) {
      hierarchy.parse(scope);
      invariant(
        Object.keys(patch).every(id => levels.some(level => level.id === id)),
        'Unknown hierarchy level.'
      );
      const selection: Record<string, HierarchySelection<string | number>> = {
        ...scope.selection,
      };
      let changed = false;
      for (const level of levels) {
        if (Object.hasOwn(patch, level.id)) {
          const value = (
            patch as Record<string, string | number | null | undefined>
          )[level.id];
          invariant(
            value !== undefined,
            'Use null to clear a hierarchy level.'
          );
          changed ||= value !== selectedMember(scope, level.id);
          selection[level.id] =
            value === null
              ? { kind: 'all' }
              : { kind: 'include', members: [{ kind: 'value', value }] };
        } else if (changed) selection[level.id] = { kind: 'all' };
      }
      return hierarchy.parse({ selection });
    },
    breakdown({
      key: breakdownKey,
      label: breakdownLabel = 'Break down by',
      history = 'push',
    }) {
      const breakdown: BreakdownVariable<Levels> = {
        kind: 'breakdown',
        hierarchy,
        label: breakdownLabel,
        presentation: { group: 'display' },
        urlKeys: [breakdownKey],
        defaultValue: levels[0]!.id,
        history,
        valid: value =>
          typeof value === 'string' && levels.some(level => level.id === value),
        read: params => {
          const value = params.get(breakdownKey);
          return value && breakdown.valid(value) ? value : levels[0]!.id;
        },
        write: value => ({
          [breakdownKey]: value === levels[0]!.id ? null : value,
        }),
        same: (left, right) => left === right,
        options(scope) {
          hierarchy.parse(scope);
          return levels;
        },
        level(value, scope) {
          const options = breakdown.options(scope);
          return options.find(level => level.id === value) ?? options[0]!;
        },
      };
      return breakdown;
    },
    input(parse, options) {
      function parser(value: unknown) {
        const input = parse(value);
        invariant(
          input && typeof input === 'object',
          'Hierarchy input must be an object.'
        );
        const raw = value as Record<string, unknown>;
        const scope = hierarchy.parse(
          options?.binding ? options.binding(input) : raw?.[key]
        );
        const breakdowns = Object.fromEntries(
          Object.entries(options?.breakdowns ?? {}).map(([name, breakdown]) => {
            invariant(
              breakdown.hierarchy === hierarchy,
              'Breakdown belongs to another hierarchy.'
            );
            invariant(
              breakdown.valid(raw?.[name] as string),
              `Invalid ${name} breakdown.`
            );
            return [name, breakdown.level(raw[name] as string, scope).id];
          })
        );
        return {
          ...input,
          ...(options?.binding ? {} : { [key]: scope }),
          ...breakdowns,
        } as ReturnType<HierarchyVariable<Levels>['input']> extends (
          value: unknown
        ) => infer Result
          ? Result
          : never;
      }
      const previous = parserHierarchies.get(parse) ?? [];
      parserHierarchies.set(parser, [
        ...previous,
        {
          hierarchy,
          scope: (input: unknown) =>
            options?.binding
              ? options.binding(input as never)
              : (input as Record<string, HierarchyScope<Levels>>)[key]!,
        },
      ]);
      return parser as never;
    },
  };
  return hierarchy;
}

type ParserHierarchy = {
  hierarchy: HierarchyVariable<any>;
  scope: (input: unknown) => HierarchyScope<readonly HierarchyLevel[]>;
};
const parserHierarchies = new WeakMap<Function, readonly ParserHierarchy[]>();
const sourceRegistries = new WeakMap<object, QueryDefinitions>();
const selectorsKey = Symbol.for('@altertable/data-app/hierarchy-selectors');
const selectorOwnerKey = Symbol.for(
  '@altertable/data-app/hierarchy-selector-owner'
);
const membershipErrorKey = Symbol.for(
  '@altertable/data-app/hierarchy-membership-error'
);
type OperationWithSelectors = DataOperation<any, any> & {
  [selectorsKey]?: DataOperations;
  [selectorOwnerKey]?: object;
};
export class HierarchyMembershipError extends Error {
  readonly [membershipErrorKey] = true;
  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [membershipErrorKey]?: unknown })[membershipErrorKey] === true
    );
  }
}

/** Internal parser capabilities never become author-supplied operation flags. */
export async function validateHierarchyInput(
  parser: Function,
  input: unknown,
  query: (
    name: string,
    params: QueryParameters,
    options: { limit: number }
  ) => Promise<QueryResult>
) {
  for (const { hierarchy, scope } of parserHierarchies.get(parser) ?? [])
    await validateMembers(hierarchy, scope(input), query);
}
async function validateMembers(
  hierarchy: HierarchyVariable<any>,
  scope: HierarchyScope<readonly HierarchyLevel[]>,
  query: (
    name: string,
    params: QueryParameters,
    options: { limit: number }
  ) => Promise<QueryResult>,
  before = hierarchy.levels.length
) {
  hierarchy.parse(scope);
  for (const [index, level] of (
    hierarchy.levels as readonly HierarchyLevel[]
  ).entries()) {
    if (index >= before) break;
    const member = selectedMember(scope, level.id);
    if (member === null || !level.source) continue;
    const options = await loadHierarchyOptions(
      hierarchy,
      scope,
      index,
      member,
      query
    );
    if (options.length !== 1 || options[0]!.value !== member)
      throw new HierarchyMembershipError(`Invalid ${level.label} member.`);
  }
}
function sourceParams(
  hierarchy: HierarchyVariable<any>,
  scope: HierarchyScope<readonly HierarchyLevel[]>,
  index: number,
  member: string | number | null
): QueryParameters {
  const level: HierarchyLevel = hierarchy.levels[index];
  const query = sourceRegistries.get(hierarchy)![level.source!.query]!;
  const params: Record<string, string | number | null> = { member };
  for (const ancestor of hierarchy.levels.slice(0, index) as HierarchyLevel[])
    if (Object.hasOwn(query.params, ancestor.id))
      params[ancestor.id] = selectedMember(scope, ancestor.id);
  for (const [parameter, id] of Object.entries(level.source!.parents ?? {}))
    params[parameter] = selectedMember(scope, id);
  return params;
}
export async function loadHierarchyOptions(
  hierarchy: HierarchyVariable<any>,
  scope: HierarchyScope<readonly HierarchyLevel[]>,
  index: number,
  member: string | number | null,
  query: (
    name: string,
    params: QueryParameters,
    options: { limit: number }
  ) => Promise<QueryResult>
): Promise<DimensionOption[]> {
  const level: HierarchyLevel = hierarchy.levels[index];
  const result = await query(
    level.source!.query,
    sourceParams(hierarchy, scope, index, member),
    { limit: member === null ? 200 : 2 }
  );
  const names = result.columns.map(column => column.name);
  invariant(
    new Set(names).size === names.length &&
      names.includes('value') &&
      names.includes('label'),
    'Hierarchy source must return value and label.'
  );
  const seen = new Set<string | number>();
  return result.rows.map(row => {
    const value = row[names.indexOf('value')];
    const label = row[names.indexOf('label')];
    const count = names.includes('count')
      ? row[names.indexOf('count')]
      : undefined;
    invariant(
      row.length === names.length &&
        typeof value === level.valueType &&
        (typeof value !== 'number' || Number.isFinite(value)) &&
        typeof label === 'string' &&
        !!label.trim() &&
        label.length <= 1000 &&
        !seen.has(value as string | number) &&
        (count === undefined ||
          (Number.isSafeInteger(count) && (count as number) >= 0)),
      'Invalid hierarchy source result.'
    );
    seen.add(value as string | number);
    return {
      value: value as string | number,
      label,
      ...(count === undefined ? {} : { count: count as number }),
    };
  });
}
export function bindHierarchySources<
  const Levels extends readonly HierarchyLevel[],
  const Key extends string,
>(
  config: { key: Key; label: string; levels: Levels },
  queries: QueryDefinitions
): HierarchyVariable<Levels, Key> {
  const hierarchy = createHierarchy(config as never);
  for (const [index, level] of config.levels.entries()) {
    if (!level.source) continue;
    const query = queries[level.source.query];
    invariant(
      query && Object.hasOwn(query.params, 'member'),
      'Hierarchy sources must declare member.'
    );
    const ancestors = config.levels.slice(0, index).map(item => item.id);
    for (const [parameter, id] of Object.entries(level.source.parents ?? {}))
      invariant(
        parameter !== 'member' &&
          Object.hasOwn(query.params, parameter) &&
          ancestors.includes(id) &&
          (!ancestors.includes(parameter) || parameter === id),
        'Invalid hierarchy parent binding.'
      );
    if (index > 0) {
      const parent = config.levels[index - 1]!.id;
      invariant(
        Object.hasOwn(query.params, parent) ||
          Object.values(level.source.parents ?? {}).includes(parent),
        'Child sources must bind their immediate parent.'
      );
    }
  }
  sourceRegistries.set(hierarchy, queries);
  return hierarchy as unknown as HierarchyVariable<Levels, Key>;
}
export function hierarchySelectorName(
  hierarchy: HierarchyVariable<any>,
  level: HierarchyLevel
) {
  return `__hierarchy:${hierarchy.key}:${level.id}`;
}
export function attachHierarchySelectors(
  operation: DataOperation<any, any>,
  queries: QueryDefinitions
) {
  const selectors: DataOperations = {};
  for (const { hierarchy } of parserHierarchies.get(operation.input) ?? []) {
    const levels = hierarchy.levels as readonly HierarchyLevel[];
    for (const [index, level] of levels.entries()) {
      if (!level.source) continue;
      const registered = sourceRegistries.get(hierarchy)?.[level.source.query];
      invariant(
        registered &&
          JSON.stringify(registered) ===
            JSON.stringify(queries[level.source.query]),
        'Hierarchy sources must belong to the operation query registry.'
      );
      const name = hierarchySelectorName(hierarchy, level);
      selectors[name] = {
        input(value: unknown) {
          invariant(
            value && typeof value === 'object',
            'Invalid hierarchy request.'
          );
          const request = value as { scope: unknown; member: unknown };
          const scope = hierarchy.parse(request.scope);
          invariant(
            request.member === null ||
              (typeof request.member === level.valueType &&
                (typeof request.member !== 'number' ||
                  Number.isFinite(request.member)) &&
                (typeof request.member !== 'string' ||
                  request.member.length <= 1000)),
            'Invalid requested member.'
          );
          invariant(
            index === 0 ||
              selectedMember(scope, hierarchy.levels[index - 1]!.id) !== null,
            'Select the parent first.'
          );
          return { scope, member: request.member as string | number | null };
        },
        checks: [null],
        policy: {
          maxDurationMs: 15_000,
          maxQueryRows: 200,
          maxResponseBytes: 1_000_000,
        },
        queryNames: Object.fromEntries(
          levels
            .slice(0, index + 1)
            .flatMap(level =>
              level.source ? [[level.source.query, level.source.query]] : []
            )
        ),
        async run(
          context,
          input: {
            scope: HierarchyScope<readonly HierarchyLevel[]>;
            member: string | number | null;
          }
        ) {
          function query(
            name: string,
            values: QueryParameters,
            options: { limit: number }
          ) {
            const definition = queries[name]!;
            return context.lakehouse.queryAll(definition.statement, {
              name,
              params: resolveQueryParameters(
                definition.params,
                values,
                context.queryParams ?? {}
              ),
              limit: options.limit,
              signal: context.signal,
            });
          }
          await validateMembers(hierarchy, input.scope, query, index);
          const options = await loadHierarchyOptions(
            hierarchy,
            input.scope,
            index,
            input.member,
            query
          );
          if (
            input.member !== null &&
            (options.length !== 1 || options[0]!.value !== input.member)
          )
            throw new HierarchyMembershipError('Invalid selected member.');
          return options;
        },
      } as DataOperation<any, any>;
      Object.defineProperty(selectors[name]!, selectorOwnerKey, {
        value: hierarchy,
      });
    }
  }
  Object.defineProperty(operation, selectorsKey, { value: selectors });
}
export function withHierarchySelectors<Operations extends DataOperations>(
  operations: Operations
): Operations {
  const expanded: DataOperations = { ...operations };
  for (const operation of Object.values(operations))
    for (const [name, selector] of Object.entries(
      (operation as OperationWithSelectors)[selectorsKey] ?? {}
    )) {
      invariant(
        !Object.hasOwn(operations, name),
        'Reserved hierarchy operation name.'
      );
      invariant(
        !expanded[name] ||
          (expanded[name] as OperationWithSelectors)[selectorOwnerKey] ===
            (selector as OperationWithSelectors)[selectorOwnerKey],
        'Hierarchy keys must be unique across the app.'
      );
      expanded[name] ??= selector;
    }
  return expanded as Operations;
}

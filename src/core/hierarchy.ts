import {
  dimensionFilter,
  type DimensionOption,
  type DimensionMember,
  type DimensionSelection,
  type DimensionValue,
  type DimensionVariable,
} from '@/src/core/dimension';
import { invariant } from '@/src/core/invariant';
import type { AppVariable } from '@/src/core/variables';

type HierarchySource<Value extends DimensionValue> =
  | {
      options: readonly (DimensionOption<Value> & {
        parent?: DimensionValue;
      })[];
      facet?: never;
    }
  | {
      options?: never;
      facet: {
        operation: string;
        input: (selection: Record<string, DimensionSelection>) => unknown;
      };
    };
export type HierarchyLevel = {
  id: string;
  label: string;
  /** Optional title wording; defaults to the selector label. */
  groupLabel?: string;
} & (
  | ({ valueType: 'string' } & HierarchySource<string>)
  | ({ valueType: 'number' } & HierarchySource<number>)
);
type LevelValue<Level extends HierarchyLevel> = Level extends {
  valueType: 'number';
}
  ? number
  : Level extends { valueType: 'string' }
    ? string
    : DimensionValue;
export type HierarchySelection<Levels extends readonly HierarchyLevel[]> = {
  [Level in Levels[number] as Level['id']]:
    | { kind: 'all' }
    | {
        kind: 'include';
        members: readonly [
          Extract<DimensionMember<LevelValue<Level>>, { kind: 'value' }>,
        ];
      };
};
export type HierarchyState<
  Levels extends readonly HierarchyLevel[] = readonly HierarchyLevel[],
> = {
  selection: HierarchySelection<Levels>;
};
export type HierarchyValues<Levels extends readonly HierarchyLevel[]> = {
  [Level in Levels[number] as Level['id']]: LevelValue<Level> | null;
};
export type HierarchyVariable<
  Levels extends readonly HierarchyLevel[] = readonly HierarchyLevel[],
> = AppVariable<HierarchyState<Levels>, 'hierarchy'> & {
  label: string;
  levels: readonly (Levels[number] & { groupLabel: string })[];
  dimensions: readonly DimensionVariable[];
  parse: (value: unknown) => HierarchyState<Levels>;
  /** Root plus successive children whose ancestors have selected values; independent of grouping. */
  visibleLevels: (
    state: HierarchyState<Levels>
  ) => readonly (Levels[number] & { groupLabel: string })[];
  filter: (
    state: HierarchyState<Levels>,
    values: Partial<HierarchyValues<Levels>>
  ) => HierarchyState<Levels>;
  /** A chart-owned URL value, separate from the shared selected scope. */
  breakdown: (options: { key: string }) => HierarchyBreakdownVariable<Levels>;
};
export type HierarchyBreakdownVariable<
  Levels extends readonly HierarchyLevel[] = readonly HierarchyLevel[],
> = AppVariable<Levels[number]['id'], 'hierarchyBreakdown'> & {
  hierarchy: HierarchyVariable<Levels>;
  parse: (value: unknown) => Levels[number]['id'];
  /** Clamp to the deepest level whose ancestors are selected. Use for queries, labels, and exports. */
  level: (
    value: Levels[number]['id'],
    scope: HierarchyState<Levels>
  ) => Levels[number] & { groupLabel: string };
};
export type HierarchyStateOf<Variable> =
  Variable extends HierarchyVariable<infer Levels>
    ? HierarchyState<Levels>
    : never;
export type HierarchyValuesOf<Variable> =
  Variable extends HierarchyVariable<infer Levels>
    ? HierarchyValues<Levels>
    : never;

/** One URL value owns single-member hierarchy scope. Parent edits clear descendants. */
export function hierarchyVariable<
  const Levels extends readonly HierarchyLevel[],
>({
  key,
  label,
  levels,
}: {
  key: string;
  label: string;
  levels: Levels;
}): HierarchyVariable<Levels> {
  invariant(
    !!key.trim() &&
      !!label.trim() &&
      levels.length > 0 &&
      levels.every(
        level =>
          !!level.id.trim() &&
          !!level.label.trim() &&
          (level.groupLabel === undefined || !!level.groupLabel.trim())
      ) &&
      new Set(levels.map(level => level.id)).size === levels.length,
    'Hierarchy needs a key, label, and uniquely named levels.'
  );
  const normalizedLevels = levels.map(level => ({
    ...level,
    groupLabel: level.groupLabel ?? level.label,
  }));
  const dimensions = levels.map(level =>
    dimensionFilter<DimensionValue>({
      key: `${key}:${level.id}`,
      label: level.label,
      valueType: level.valueType,
      selectionMode: 'single',
      ...(level.facet
        ? {
            facet: {
              operation: level.facet.operation,
              input: values =>
                level.facet!.input(
                  values as Record<string, DimensionSelection>
                ),
            },
          }
        : { options: level.options ?? [] }),
    })
  );
  const defaultValue = {
    selection: Object.fromEntries(
      levels.map(level => [level.id, { kind: 'all' }])
    ),
  } as HierarchyState<Levels>;
  function index(id: string) {
    const position = levels.findIndex(level => level.id === id);
    invariant(position >= 0, `Unknown hierarchy level: ${id}.`);
    return position;
  }
  function selected(state: HierarchyState<Levels>, id: string) {
    const selection = (state.selection as Record<string, DimensionSelection>)[
      id
    ]!;
    return selection.kind === 'all' ? null : selection.members[0];
  }
  function parse(value: unknown): HierarchyState<Levels> {
    invariant(
      value && typeof value === 'object' && !Array.isArray(value),
      'Expected hierarchy state.'
    );
    const state = value as HierarchyState<Levels>;
    invariant(
      state.selection &&
        typeof state.selection === 'object' &&
        !Array.isArray(state.selection),
      'Expected hierarchy selection.'
    );
    invariant(
      Object.keys(state.selection).length === levels.length &&
        Object.keys(state.selection).every(id =>
          levels.some(level => level.id === id)
        ),
      'Hierarchy selection must contain only declared levels.'
    );
    const selection: Record<string, DimensionSelection> = {};
    for (const [position, level] of levels.entries()) {
      const entry = (state.selection as Record<string, DimensionSelection>)[
        level.id
      ];
      invariant(
        entry && dimensions[position]!.valid(entry),
        `Invalid ${level.label} selection.`
      );
      if (position > 0 && entry.kind !== 'all')
        invariant(
          selected(state, levels[position - 1]!.id) !== null,
          'Selected members require selected ancestors.'
        );
      if (entry.kind !== 'all') {
        invariant(
          entry.kind === 'include' && entry.members[0]?.kind === 'value',
          'Hierarchy levels select one value.'
        );
        const member = entry.members[0];
        const option = level.options?.find(
          option => option.value === member.value
        );
        if (option?.parent !== undefined) {
          const parentLevel = levels[position - 1];
          const parent = parentLevel && selected(state, parentLevel.id);
          invariant(
            parent?.kind === 'value' && parent.value === option.parent,
            `${level.label} does not belong to its selected parent.`
          );
        }
        selection[level.id] = {
          kind: 'include',
          members: [{ kind: 'value', value: member.value }],
        };
      } else selection[level.id] = { kind: 'all' };
    }
    invariant(
      JSON.stringify(selection).length <= 8192,
      'Hierarchy selection must fit in a shared URL.'
    );
    return { selection } as HierarchyState<Levels>;
  }
  function filter(
    state: HierarchyState<Levels>,
    values: Partial<HierarchyValues<Levels>>
  ) {
    let next = parse(state);
    for (const id of Object.keys(values)) index(id);
    for (const [position, level] of levels.entries()) {
      if (!Object.hasOwn(values, level.id)) continue;
      const value = (values as Record<string, DimensionValue | null>)[level.id];
      invariant(
        value === null || typeof value === level.valueType,
        `Invalid ${level.label} value.`
      );
      const existing = selected(next, level.id);
      if (
        (value === null && existing === null) ||
        (existing?.kind === 'value' && existing.value === value)
      )
        continue;
      const selection = { ...next.selection } as Record<
        string,
        DimensionSelection
      >;
      selection[level.id] =
        value === null
          ? { kind: 'all' }
          : { kind: 'include', members: [{ kind: 'value', value: value! }] };
      for (const child of levels.slice(position + 1))
        selection[child.id] = { kind: 'all' };
      next = parse({ selection });
    }
    return next;
  }
  function visibleLevels(state: HierarchyState<Levels>) {
    const next = parse(state);
    const firstAll = levels.findIndex(
      level => selected(next, level.id) === null
    );
    return normalizedLevels.slice(
      0,
      firstAll === -1 ? levels.length : firstAll + 1
    );
  }
  function same(left: HierarchyState<Levels>, right: HierarchyState<Levels>) {
    return JSON.stringify(parse(left)) === JSON.stringify(parse(right));
  }
  const variable: HierarchyVariable<Levels> = {
    kind: 'hierarchy',
    label,
    levels: normalizedLevels,
    dimensions,
    urlKeys: [key],
    defaultValue,
    clearValue: defaultValue,
    history: 'push',
    parse,
    visibleLevels,
    filter,
    same,
    breakdown({ key: breakdownKey }) {
      invariant(
        !!breakdownKey.trim() && breakdownKey !== key,
        'A breakdown needs its own URL key.'
      );
      const hierarchy = variable;
      const defaultValue = levels[0]!.id;
      function parse(value: unknown) {
        if (value == null) return defaultValue;
        invariant(
          typeof value === 'string',
          'Expected a hierarchy breakdown level.'
        );
        index(value);
        return value as Levels[number]['id'];
      }
      function level(value: string, scope: HierarchyState<Levels>) {
        const shown = visibleLevels(scope);
        return normalizedLevels[
          Math.min(index(parse(value)), shown.length - 1)
        ]!;
      }
      return {
        kind: 'hierarchyBreakdown',
        hierarchy,
        label: 'Break down by',
        urlKeys: [breakdownKey],
        defaultValue,
        history: 'push',
        parse,
        level,
        read(params) {
          let requested = defaultValue;
          try {
            requested = parse(params.get(breakdownKey));
          } catch {
            /* Invalid URLs use the root level. */
          }
          return level(requested, hierarchy.read(params)).id;
        },
        write(value) {
          const id = parse(value);
          return { [breakdownKey]: id === defaultValue ? null : id };
        },
        valid(value): value is Levels[number]['id'] {
          try {
            return typeof value === 'string' && parse(value) === value;
          } catch {
            return false;
          }
        },
        same: (left, right) => left === right,
      } satisfies HierarchyBreakdownVariable<Levels>;
    },
    describe(state) {
      const next = parse(state);
      return visibleLevels(next)
        .map(
          (level, position) =>
            `${level.label}: ${dimensions[position]!.describe((next.selection as Record<string, DimensionSelection>)[level.id]!)}`
        )
        .join(' · ');
    },
    read(params) {
      try {
        const raw = params.get(key);
        return raw && raw.length <= 10000
          ? parse(JSON.parse(raw))
          : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    write(state) {
      const next = parse(state);
      return { [key]: same(next, defaultValue) ? null : JSON.stringify(next) };
    },
    valid(state): state is HierarchyState<Levels> {
      try {
        parse(state);
        return true;
      } catch {
        return false;
      }
    },
  };
  return variable;
}

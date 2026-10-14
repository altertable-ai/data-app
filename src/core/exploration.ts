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

type ExplorationSource<Value extends DimensionValue> =
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
export type ExplorationLevel = {
  id: string;
  label: string;
  /** Optional title wording; defaults to the selector label. */
  groupLabel?: string;
} & (
  | ({ valueType: 'string' } & ExplorationSource<string>)
  | ({ valueType: 'number' } & ExplorationSource<number>)
);
type LevelValue<Level extends ExplorationLevel> = Level extends {
  valueType: 'number';
}
  ? number
  : Level extends { valueType: 'string' }
    ? string
    : DimensionValue;
export type ExplorationSelection<Levels extends readonly ExplorationLevel[]> = {
  [Level in Levels[number] as Level['id']]:
    | { kind: 'all' }
    | {
        kind: 'include';
        members: readonly [
          Extract<DimensionMember<LevelValue<Level>>, { kind: 'value' }>,
        ];
      };
};
export type ExplorationState<
  Levels extends readonly ExplorationLevel[] = readonly ExplorationLevel[],
> = {
  selection: ExplorationSelection<Levels>;
  groupBy: Levels[number]['id'];
};
export type ExplorationValues<Levels extends readonly ExplorationLevel[]> = {
  [Level in Levels[number] as Level['id']]: LevelValue<Level> | null;
};
export type ExplorationVariable<
  Levels extends readonly ExplorationLevel[] = readonly ExplorationLevel[],
> = AppVariable<ExplorationState<Levels>, 'exploration'> & {
  label: string;
  levels: readonly (Levels[number] & { groupLabel: string })[];
  dimensions: readonly DimensionVariable[];
  parse: (value: unknown) => ExplorationState<Levels>;
  level: (
    value: ExplorationState<Levels>
  ) => Levels[number] & { groupLabel: string };
  /** Root plus successive children whose ancestors have selected values; independent of grouping. */
  visibleLevels: (
    state: ExplorationState<Levels>
  ) => readonly (Levels[number] & { groupLabel: string })[];
  filter: (
    state: ExplorationState<Levels>,
    values: Partial<ExplorationValues<Levels>>
  ) => ExplorationState<Levels>;
  descend: (
    state: ExplorationState<Levels>,
    id: DimensionValue
  ) => ExplorationState<Levels>;
  navigate: (
    state: ExplorationState<Levels>,
    level: Levels[number]['id']
  ) => ExplorationState<Levels>;
};
export type ExplorationStateOf<Variable> =
  Variable extends ExplorationVariable<infer Levels>
    ? ExplorationState<Levels>
    : never;
export type ExplorationValuesOf<Variable> =
  Variable extends ExplorationVariable<infer Levels>
    ? ExplorationValues<Levels>
    : never;

/** One URL value owns single-member hierarchy scope and grouping. Parent edits clear descendants. */
export function explorationVariable<
  const Levels extends readonly ExplorationLevel[],
>({
  key,
  label,
  levels,
}: {
  key: string;
  label: string;
  levels: Levels;
}): ExplorationVariable<Levels> {
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
    'Exploration needs a key, label, and uniquely named levels.'
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
    groupBy: levels[0]!.id,
  } as ExplorationState<Levels>;
  function index(id: string) {
    const position = levels.findIndex(level => level.id === id);
    invariant(position >= 0, `Unknown exploration level: ${id}.`);
    return position;
  }
  function selected(state: ExplorationState<Levels>, id: string) {
    const selection = (state.selection as Record<string, DimensionSelection>)[
      id
    ]!;
    return selection.kind === 'all' ? null : selection.members[0];
  }
  function parse(value: unknown): ExplorationState<Levels> {
    invariant(
      value && typeof value === 'object' && !Array.isArray(value),
      'Expected exploration state.'
    );
    const state = value as ExplorationState<Levels>;
    invariant(
      typeof state.groupBy === 'string' &&
        state.selection &&
        typeof state.selection === 'object' &&
        !Array.isArray(state.selection),
      'Expected exploration selection and grouping.'
    );
    const group = index(state.groupBy);
    invariant(
      Object.keys(state.selection).length === levels.length &&
        Object.keys(state.selection).every(id =>
          levels.some(level => level.id === id)
        ),
      'Exploration selection must contain only declared levels.'
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
      if (position < group)
        invariant(
          entry.kind !== 'all',
          'Grouping requires selected ancestors.'
        );
      if (position > 0 && entry.kind !== 'all')
        invariant(
          selected(state, levels[position - 1]!.id) !== null,
          'Selected members require selected ancestors.'
        );
      if (entry.kind !== 'all') {
        invariant(
          entry.kind === 'include' && entry.members[0]?.kind === 'value',
          'Exploration levels select one value.'
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
      'Exploration selection must fit in a shared URL.'
    );
    return { selection, groupBy: state.groupBy } as ExplorationState<Levels>;
  }
  function filter(
    state: ExplorationState<Levels>,
    values: Partial<ExplorationValues<Levels>>
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
      const groupBy =
        levels[
          Math.min(
            index(next.groupBy),
            value === null ? position : position + 1
          )
        ]!.id;
      next = parse({ selection, groupBy });
    }
    return next;
  }
  function visibleLevels(state: ExplorationState<Levels>) {
    const next = parse(state);
    const firstAll = levels.findIndex(
      level => selected(next, level.id) === null
    );
    return normalizedLevels.slice(
      0,
      firstAll === -1 ? levels.length : firstAll + 1
    );
  }
  function same(
    left: ExplorationState<Levels>,
    right: ExplorationState<Levels>
  ) {
    return JSON.stringify(parse(left)) === JSON.stringify(parse(right));
  }
  return {
    kind: 'exploration',
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
    level: state => normalizedLevels[index(parse(state).groupBy)]!,
    descend(state, id) {
      const current = parse(state);
      const position = index(current.groupBy);
      invariant(
        position < levels.length - 1,
        'Already at the final exploration level.'
      );
      const next = filter(current, { [current.groupBy]: id } as Partial<
        ExplorationValues<Levels>
      >);
      return parse({ ...next, groupBy: levels[position + 1]!.id });
    },
    navigate(state, id) {
      const next = parse(state);
      const position = index(id);
      invariant(
        position <= index(next.groupBy),
        'Navigate through displayed ancestors.'
      );
      const selection = { ...next.selection } as Record<
        string,
        DimensionSelection
      >;
      for (const level of levels.slice(position + 1))
        selection[level.id] = { kind: 'all' };
      return parse({ selection, groupBy: id });
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
    valid(state): state is ExplorationState<Levels> {
      try {
        parse(state);
        return true;
      } catch {
        return false;
      }
    },
  } as ExplorationVariable<Levels>;
}

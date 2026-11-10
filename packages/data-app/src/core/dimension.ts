import type {
  AppFilter,
  HistoryMode,
  FilterPresentation,
} from './app-filters.ts';
import { facetSource } from './facets.ts';
import { invariant } from './invariant.ts';
import { KEY_SEPARATOR } from './keys.ts';

export type DimensionValue = string | number;
export type DimensionMember<T extends DimensionValue = DimensionValue> =
  | { kind: 'value'; value: T }
  | { kind: 'missing' };
export type DimensionSelection<T extends DimensionValue = DimensionValue> =
  | { kind: 'all' }
  | { kind: 'include' | 'exclude'; members: readonly DimensionMember<T>[] };
export type DimensionOption<T extends DimensionValue = DimensionValue> = {
  value: T;
  label: string;
  count?: number;
};
export type DimensionSelectionFilter<
  T extends DimensionValue = DimensionValue,
> = AppFilter<DimensionSelection<T>, 'dimension'> & {
  readonly optionsSource: 'fixed' | 'query';
  label: string;
  selectionMode: 'single' | 'multiple';
  readonly valueType: T extends number ? 'number' : 'string';
  allowMissing: boolean;
  allowExclusion: boolean;
  maxSelected: number;
  options: readonly DimensionOption<T>[];
  describe: (
    selection: DimensionSelection<T>,
    options?: readonly DimensionOption<T>[]
  ) => string;
};

/** A fixed-option dimension retains its distinction from query-backed facets. */
export type DimensionFilter<T extends DimensionValue = DimensionValue> =
  DimensionSelectionFilter<T> & {
    readonly optionsSource: 'fixed';
    readonly [facetSource]?: never;
  };

const allSelection: DimensionSelection<never> = { kind: 'all' };

/** Selections are equal when they keep the same members, in any order. */
function selectionKey(value: DimensionSelection) {
  return value.kind === 'all'
    ? 'all'
    : [value.kind, ...value.members.map(dimensionMemberKey).sort()].join(
        KEY_SEPARATOR
      );
}

export function dimensionMemberKey(member: DimensionMember) {
  return member.kind === 'missing'
    ? 'missing'
    : ['value', typeof member.value, member.value].join(KEY_SEPARATOR);
}

export type DimensionSettings = {
  key: string;
  label: string;
  allowMissing?: boolean;
  allowExclusion?: boolean;
  history?: HistoryMode;
  presentation?: FilterPresentation;
} & (
  | { selectionMode: 'single'; maxSelected?: 1 }
  | { selectionMode: 'multiple'; maxSelected?: number }
);

export type DimensionFilterSettings<T extends DimensionValue> =
  DimensionSettings & {
    valueType: T extends number ? 'number' : 'string';
    /** The selection before readers change it, such as paid orders only. Clearing
     * filters still returns to every member. Defaults to `{ kind: 'all' }`. */
    defaultValue?: DimensionSelection<NoInfer<T>>;
  };

export type DimensionFilterOptions<T extends DimensionValue> =
  DimensionFilterSettings<T> & {
    options: readonly DimensionOption<T>[];
    facet?: never;
  };

/** A bounded categorical filter with app-owned fixed options. */
export function dimensionFilter<const T extends string>(
  config: DimensionFilterOptions<T>
): DimensionFilter<T>;
export function dimensionFilter<const T extends number>(
  config: DimensionFilterOptions<T>
): DimensionFilter<T>;
export function dimensionFilter<const T extends DimensionValue>(
  config: DimensionFilterOptions<T>
): DimensionFilter<T> {
  return { ...createDimensionFilter(config), optionsSource: 'fixed' };
}

/** Shared fixed-option and query-backed selection behavior. */
export function createDimensionFilter<const T extends DimensionValue>(
  config: DimensionFilterSettings<T> & {
    options: readonly DimensionOption<T>[];
  },
  dynamic = false
): DimensionSelectionFilter<T> {
  const { key, label, selectionMode, valueType } = config;
  const options = config.options ?? [];
  const optionKeys = options.map(option =>
    dimensionMemberKey({ kind: 'value', value: option.value })
  );
  invariant(
    !!key &&
      options.length <= 200 &&
      new Set(optionKeys).size === options.length,
    'Dimension options need a key, at most 200 distinct values.'
  );
  invariant(
    options.every(
      option =>
        typeof option.value === valueType &&
        !!option.label.trim() &&
        (option.count === undefined ||
          (Number.isSafeInteger(option.count) && option.count >= 0))
    ),
    'Dimension options need typed values, labels, and nonnegative counts.'
  );
  const allowed = new Set(optionKeys);
  const maxSelected =
    config.maxSelected ?? (selectionMode === 'single' ? 1 : 20);
  invariant(
    Number.isInteger(maxSelected) &&
      maxSelected >= 1 &&
      maxSelected <= 50 &&
      (selectionMode !== 'single' || maxSelected === 1),
    'Dimension selection limit is invalid.'
  );
  const allowMissing = config.allowMissing ?? false;
  const defaultValue: DimensionSelection<T> =
    config.defaultValue ?? allSelection;

  function validMember(member: DimensionMember<T>): boolean {
    if (!member || typeof member !== 'object') return false;
    if (member.kind === 'missing') return allowMissing;
    if (member.kind !== 'value' || typeof member.value !== valueType)
      return false;
    if (!dynamic) return allowed.has(dimensionMemberKey(member));

    return typeof member.value === 'number'
      ? Number.isFinite(member.value)
      : member.value.length <= 100;
  }

  function valid(value: DimensionSelection<T>): boolean {
    if (!value || typeof value !== 'object') return false;
    if (value.kind === 'all') return true;
    if (
      (value.kind !== 'include' &&
        !(config.allowExclusion && value.kind === 'exclude')) ||
      !Array.isArray(value.members) ||
      !value.members.length ||
      value.members.length > maxSelected
    )
      return false;
    if (!value.members.every(validMember)) return false;
    const ids = value.members.map(dimensionMemberKey);

    return new Set(ids).size === ids.length;
  }

  invariant(valid(defaultValue), `Invalid default selection for ${label}.`);

  /** The default selection has no URL value; every member is explicit when it differs. */
  function encode(value: DimensionSelection<T>) {
    if (same(value, defaultValue)) return null;
    return value.kind === 'all'
      ? JSON.stringify({ kind: 'all' })
      : JSON.stringify({
          kind: value.kind,
          members: value.members.map(member =>
            member.kind === 'missing' ? ['m'] : ['v', member.value]
          ),
        });
  }

  function same(left: DimensionSelection<T>, right: DimensionSelection<T>) {
    return selectionKey(left) === selectionKey(right);
  }

  function parse(raw: string | null): DimensionSelection<T> {
    if (raw === null) return defaultValue;
    if (raw.length > 4096) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      const tokens = Array.isArray(parsed)
        ? { kind: 'include', members: parsed }
        : parsed;
      if (tokens?.kind === 'all') return allSelection;
      if (!tokens || !Array.isArray(tokens.members)) return defaultValue;
      const value = {
        kind: tokens.kind,
        members: tokens.members.map((token: unknown) =>
          Array.isArray(token) && token.length === 1 && token[0] === 'm'
            ? { kind: 'missing' as const }
            : Array.isArray(token) && token.length === 2 && token[0] === 'v'
              ? { kind: 'value' as const, value: token[1] as T }
              : { kind: 'invalid' as const }
        ),
      };

      return valid(value as DimensionSelection<T>)
        ? (value as DimensionSelection<T>)
        : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  return {
    kind: 'dimension',
    optionsSource: dynamic ? 'query' : 'fixed',
    presentation: config.presentation,
    label,
    valueType,
    selectionMode,
    options,
    allowMissing,
    allowExclusion: config.allowExclusion ?? false,
    maxSelected,
    urlKeys: [key],
    defaultValue,
    clearValue: allSelection,
    history: config.history ?? 'push',
    valid,
    same,
    read(params) {
      return parse(params.get(key));
    },
    write(value) {
      return { [key]: encode(value) };
    },
    describe(
      value: DimensionSelection<T>,
      suppliedOptions: readonly DimensionOption<T>[] = options
    ) {
      return value.kind === 'all'
        ? `All ${label.toLocaleLowerCase()}`
        : `${value.kind === 'exclude' ? 'Exclude: ' : ''}${value.members
            .map(member =>
              member.kind === 'missing'
                ? 'Missing'
                : (suppliedOptions.find(option => option.value === member.value)
                    ?.label ?? String(member.value))
            )
            .join(', ')}`;
    },
  };
}

/** Server-side parser; call from the operation input parser before building SQL. */
export function parseDimensionSelection<T extends DimensionValue>(
  value: unknown,
  filter: DimensionSelectionFilter<T>
): DimensionSelection<T> {
  invariant(
    filter.valid(value as DimensionSelection<T>),
    `Invalid ${filter.label} selection.`
  );

  return value as DimensionSelection<T>;
}

/** Validate bounded facet results before showing them in a picker. */
export function parseFacetOptions<T extends DimensionValue>(
  value: unknown,
  filter: DimensionSelectionFilter<T>
): DimensionOption<T>[] {
  invariant(
    Array.isArray(value) && value.length <= 200,
    'Facet options exceed their bound.'
  );
  const options: DimensionOption<T>[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    invariant(item && typeof item === 'object', 'Invalid facet option.');
    const option = item as DimensionOption<T>;
    invariant(
      typeof option.value === filter.valueType &&
        filter.valid({
          kind: 'include',
          members: [{ kind: 'value', value: option.value }],
        }) &&
        typeof option.label === 'string' &&
        !!option.label.trim() &&
        option.label.length <= 100 &&
        (option.count === undefined ||
          (Number.isSafeInteger(option.count) && option.count >= 0)),
      'Invalid facet option.'
    );
    const id = dimensionMemberKey({ kind: 'value', value: option.value });
    invariant(!seen.has(id), 'Duplicate facet option.');
    seen.add(id);
    options.push(option);
  }

  return options;
}

/** Central SQL literal encoding for transports without bound parameters. Column is an allowlisted identifier. */
export function dimensionPredicate<
  T extends DimensionValue,
  const Columns extends readonly string[],
>(
  column: Columns[number],
  selection: DimensionSelection<T>,
  allowedColumns: Columns
): string {
  invariant(
    allowedColumns.includes(column) &&
      /^[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*$/.test(column),
    'Invalid dimension column.'
  );
  if (selection.kind === 'all') return '';
  invariant(
    selection.members.length > 0,
    'Empty dimension inclusion is invalid.'
  );
  const values = selection.members.filter(
    (member): member is Extract<DimensionMember<T>, { kind: 'value' }> =>
      member.kind === 'value'
  );
  const missing = selection.members.some(member => member.kind === 'missing');
  const literals = values.map(({ value }) => {
    if (typeof value === 'number') {
      invariant(Number.isFinite(value), 'Invalid numeric dimension value.');

      return String(value);
    }
    const text = value as string;
    for (let index = 0; index < text.length; index++)
      invariant(
        text.charCodeAt(index) >= 32 && text.charCodeAt(index) !== 127,
        'Invalid control character in dimension value.'
      );

    return `'${text.replaceAll("'", "''")}'`;
  });
  const clauses = [
    ...(literals.length ? [`${column} IN (${literals.join(', ')})`] : []),
    ...(missing ? [`${column} IS NULL`] : []),
  ];

  const predicate = `(${clauses.join(' OR ')})`;
  // Excluding values retains missing records unless missing itself is excluded.
  return selection.kind === 'exclude'
    ? missing
      ? `NOT ${predicate}`
      : `(${column} IS NULL OR NOT ${predicate})`
    : predicate;
}

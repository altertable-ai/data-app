import { invariant } from '@/src/core/invariant';
import type { AppVariable, HistoryMode } from '@/src/core/variables';

export type NumberOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
export type NumberSelection =
  | { kind: 'all' }
  | { kind: 'comparison'; operator: NumberOperator; value: number }
  | { kind: 'range'; min?: number; max?: number };
export type BooleanSelection = { kind: 'all' } | { kind: 'is'; value: boolean };
export type NumberFilter = AppVariable<NumberSelection, 'numberFilter'> & {
  label: string;
  min?: number;
  max?: number;
};
export type BooleanFilter = AppVariable<BooleanSelection, 'booleanFilter'> & {
  label: string;
};

type FilterOptions<Value> = {
  key: string;
  label: string;
  defaultValue?: Value;
  history?: HistoryMode;
};
const all = { kind: 'all' } as const;
export const numberOperatorLabels: Record<NumberOperator, string> = {
  eq: 'Equals',
  ne: 'Does not equal',
  gt: 'Greater than',
  gte: 'At least',
  lt: 'Less than',
  lte: 'At most',
};

/** Exact numeric predicates; range bounds are inclusive and may be open-ended. */
export function numberFilter({
  key,
  label,
  min,
  max,
  defaultValue = all,
  history = 'push',
}: FilterOptions<NumberSelection> & {
  min?: number;
  max?: number;
}): NumberFilter {
  invariant(!!key.trim(), 'Numeric filter requires a URL key.');
  invariant(
    (min === undefined || Number.isFinite(min)) &&
      (max === undefined || Number.isFinite(max)) &&
      (min === undefined || max === undefined || min <= max),
    'Invalid numeric filter bounds.'
  );
  function validNumber(value: unknown): value is number {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (min === undefined || value >= min) &&
      (max === undefined || value <= max)
    );
  }
  function valid(value: NumberSelection) {
    if (!value || typeof value !== 'object') return false;
    if (value.kind === 'all') return true;
    if (value.kind === 'comparison')
      return (
        typeof value.operator === 'string' &&
        Object.hasOwn(numberOperatorLabels, value.operator) &&
        validNumber(value.value)
      );
    return (
      value.kind === 'range' &&
      (value.min !== undefined || value.max !== undefined) &&
      (value.min === undefined || validNumber(value.min)) &&
      (value.max === undefined || validNumber(value.max)) &&
      (value.min === undefined ||
        value.max === undefined ||
        value.min <= value.max)
    );
  }
  function encode(value: NumberSelection) {
    return value.kind === 'all'
      ? null
      : value.kind === 'range'
        ? JSON.stringify({ kind: 'range', min: value.min, max: value.max })
        : JSON.stringify({
            kind: 'comparison',
            operator: value.operator,
            value: value.value,
          });
  }
  invariant(valid(defaultValue), `Invalid default for ${label}.`);
  return {
    kind: 'numberFilter',
    label,
    min,
    max,
    defaultValue,
    clearValue: all,
    urlKeys: [key],
    history,
    valid,
    same: (left, right) => encode(left) === encode(right),
    describe(value) {
      return value.kind === 'all'
        ? 'Any'
        : value.kind === 'comparison'
          ? `${numberOperatorLabels[value.operator]} ${value.value}`
          : value.min === undefined
            ? `At most ${value.max}`
            : value.max === undefined
              ? `At least ${value.min}`
              : `${value.min}–${value.max}`;
    },
    read(params) {
      const raw = params.get(key);
      if (raw === null) return defaultValue;
      if (raw.length > 512) return defaultValue;
      try {
        const value = raw === 'all' ? all : JSON.parse(raw);
        return valid(value) ? value : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    write(value) {
      return {
        [key]:
          encode(value) === encode(defaultValue)
            ? null
            : value.kind === 'all'
              ? 'all'
              : encode(value),
      };
    },
  };
}

/** Boolean predicate with a distinct unrestricted state. */
export function booleanFilter({
  key,
  label,
  defaultValue = all,
  history = 'push',
}: FilterOptions<BooleanSelection>): BooleanFilter {
  invariant(!!key.trim(), 'Boolean filter requires a URL key.');
  function valid(value: BooleanSelection) {
    return (
      !!value &&
      typeof value === 'object' &&
      (value.kind === 'all' ||
        (value.kind === 'is' && typeof value.value === 'boolean'))
    );
  }
  function encode(value: BooleanSelection) {
    return value.kind === 'all' ? 'all' : String(value.value);
  }
  invariant(valid(defaultValue), `Invalid default for ${label}.`);
  return {
    kind: 'booleanFilter',
    label,
    defaultValue,
    clearValue: all,
    urlKeys: [key],
    history,
    valid,
    describe: value =>
      value.kind === 'all' ? 'Any' : value.value ? 'Yes' : 'No',
    same: (left, right) => encode(left) === encode(right),
    read(params) {
      const raw = params.get(key);
      return raw === 'all'
        ? all
        : raw === 'true' || raw === 'false'
          ? { kind: 'is', value: raw === 'true' }
          : defaultValue;
    },
    write(value) {
      return {
        [key]: encode(value) === encode(defaultValue) ? null : encode(value),
      };
    },
  };
}

export function parseNumberSelection(
  value: unknown,
  filter: NumberFilter
): NumberSelection {
  invariant(
    filter.valid(value as NumberSelection),
    `Invalid ${filter.label} selection.`
  );
  return value as NumberSelection;
}
export function parseBooleanSelection(
  value: unknown,
  filter: BooleanFilter
): BooleanSelection {
  invariant(
    filter.valid(value as BooleanSelection),
    `Invalid ${filter.label} selection.`
  );
  return value as BooleanSelection;
}

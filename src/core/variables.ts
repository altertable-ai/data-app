import {
  defineQueryVariables,
  parseQueryVariable,
  type QueryVariableDefinition,
  type QueryVariableValues,
} from '@/src/core/query-variables';
import {
  availableDatePresets,
  type DatePresetId,
  type DateRange,
} from '@/src/core/date-range';
import type { DateRangeContract, DateRangeRequest } from '@/src/core/contract';
import type {
  DimensionSelection,
  DimensionVariable,
} from '@/src/core/dimension';
import { invariant } from '@/src/core/invariant';

import type { HistoryMode } from '@/src/core/navigation';
export type { HistoryMode } from '@/src/core/navigation';

/** An app-owned value with one URL representation. Controls never parse or write routes. */
export type AppVariable<
  Value,
  Kind extends string = Value extends string ? 'text' | 'select' : 'dateRange',
> = {
  kind: Kind;
  label?: string;
  options?: readonly { id: string; label: string }[];
  urlKeys: readonly string[];
  defaultValue: Value;
  history: HistoryMode;
  read: (params: URLSearchParams) => Value;
  write: (value: Value) => Record<string, string | null>;
  valid: (value: Value) => boolean;
  same: (left: Value, right: Value) => boolean;
};

export type VariableCollection = Record<
  string,
  | AppVariable<string>
  | DateRangeVariable
  | DimensionVariable<any>
  | QueryVariable<any>
>;
export type AppVariableValues<Variables> = {
  [Key in keyof Variables]: Variables[Key] extends DimensionVariable<
    infer Value
  >
    ? DimensionSelection<Value>
    : Variables[Key] extends AppVariable<infer Value, string>
      ? Value
      : never;
};

/** Name variables once in the app. URL keys must be unique across its controls. */
export function defineAppVariables<const Variables extends VariableCollection>(
  variables: Variables
): Variables {
  const owners = new Map<string, string>();
  for (const [name, variable] of Object.entries(variables)) {
    for (const key of variable.urlKeys) {
      invariant(
        !['view', 'about', 'tab', 'present', 'step'].includes(key),
        `Variable ${name} uses reserved URL key: ${key}.`
      );
      invariant(
        !!key && !owners.has(key),
        `Variable ${name} has an empty or duplicate URL key: ${key}.`
      );
      owners.set(key, name);
    }
  }

  return variables;
}

type ScalarVariableOptions = {
  label?: string;
  key: string;
  defaultValue?: string;
  history?: HistoryMode;
};

/** A local text filter. Typing replaces the current history entry by default. */
export function textVariable({
  key,
  label,
  defaultValue = '',
  history = 'replace',
}: ScalarVariableOptions): AppVariable<string> {
  return {
    kind: 'text',
    label: label ?? key,
    urlKeys: [key],
    defaultValue,
    history,
    read(params) {
      return params.get(key) ?? defaultValue;
    },
    write(value) {
      return { [key]: value === defaultValue ? null : value };
    },
    valid(value) {
      return typeof value === 'string';
    },
    same(left, right) {
      return left === right;
    },
  };
}

/** A single choice. Supply values when the option set is known before data loads. */
export function selectVariable({
  key,
  label,
  defaultValue,
  values,
  history = 'push',
}: ScalarVariableOptions & {
  defaultValue: string;
  values?: readonly string[];
}): AppVariable<string> {
  invariant(
    !values || values.includes(defaultValue),
    `Select variable ${key} must include its default value.`
  );

  function valid(value: string) {
    return typeof value === 'string' && (!values || values.includes(value));
  }

  return {
    kind: 'select',
    label: label ?? key,
    options: values?.map(id => ({ id, label: id })),
    urlKeys: [key],
    defaultValue,
    history,
    read(params) {
      const value = params.get(key);

      return value !== null && valid(value) ? value : defaultValue;
    },
    write(value) {
      return { [key]: value === defaultValue ? null : value };
    },
    valid,
    same(left, right) {
      return left === right;
    },
  };
}

export type DateRangeSelection =
  | { kind: 'preset'; id: DatePresetId; comparison?: 'previous' }
  | { kind: 'dates'; start: string; end: string; comparison?: 'previous' };

export type DateRangeVariableOptions = {
  label?: string;
  /** URL key for a relative preset; explicit dates use startKey and endKey. */
  key: string;
  startKey?: string;
  endKey?: string;
  defaultValue: DateRangeSelection & { comparison?: never };
  contract: DateRangeContract;
  history?: HistoryMode;
  /** Opt into a URL-backed comparison with the preceding equal-length range. */
  comparison?: boolean;
  comparisonKey?: string;
};

export type DateRangeVariable = AppVariable<DateRangeSelection> & {
  kind: 'dateRange';
  supportsComparison: boolean;
  input: (selection: DateRangeSelection) => DateRangeRequest;
  describeInput: (input: DateRangeRequest) => string;
  bounds: () => {
    minDate?: string;
    maxDate: string;
    maxRangeDays: number;
    timeZone: string;
  };
  resolve: (selection: DateRangeSelection) => DateRange;
  previous: (selection: DateRangeSelection) => DateRange | null;
  comparisonRange: (selection: DateRangeSelection) => DateRange | null;
};

const PRESET_IDS = new Set<DatePresetId>([
  'day',
  'last-3',
  'last-7',
  'last-14',
  'last-30',
  'last-90',
  'this-week',
  'previous-week',
  'this-month',
  'previous-month',
]);

/** A date variable keeps relative presets relative and validates exact dates against source coverage. */
export function dateRangeVariable({
  key,
  label = 'Date range',
  startKey = 'start',
  endKey = 'end',
  defaultValue,
  contract,
  history = 'push',
  comparison = false,
  comparisonKey = 'compare',
}: DateRangeVariableOptions): DateRangeVariable {
  const bounds = contract.bounds;

  function resolve(selection: DateRangeSelection): DateRange {
    const limits = bounds();
    if (selection.kind === 'preset') {
      const preset = availableDatePresets(limits).find(
        item => item.id === selection.id
      );
      if (preset) return preset.range;
    } else {
      try {
        return contract.parse(selection);
      } catch {
        // Invalid URL values fall back to the app default.
      }
    }
    invariant(
      false,
      `Date variable ${key} is outside its available data range.`
    );
  }

  function same(left: DateRangeSelection, right: DateRangeSelection) {
    return (
      left.kind === right.kind &&
      left.comparison === right.comparison &&
      (left.kind === 'preset' && right.kind === 'preset'
        ? left.id === right.id
        : left.kind === 'dates' &&
          right.kind === 'dates' &&
          left.start === right.start &&
          left.end === right.end)
    );
  }
  const variable: DateRangeVariable = {
    kind: 'dateRange',
    label,
    supportsComparison: comparison,
    input(selection) {
      return contract.request(
        resolve(selection),
        selection.comparison === 'previous' && comparison
      );
    },
    describeInput(input) {
      return contract.describeInput(input.range);
    },
    urlKeys: comparison
      ? [key, startKey, endKey, comparisonKey]
      : [key, startKey, endKey],
    defaultValue,
    history,
    bounds,
    resolve,
    previous(selection) {
      return comparison ? contract.comparison(resolve(selection)) : null;
    },
    comparisonRange(selection) {
      return selection.comparison === 'previous' && comparison
        ? contract.comparison(resolve(selection))
        : null;
    },
    same,
    valid(value) {
      try {
        const range = resolve(value);

        return (
          value.comparison === undefined ||
          (value.comparison === 'previous' &&
            comparison &&
            contract.comparison(range) !== null)
        );
      } catch {
        return false;
      }
    },
    read(params) {
      function withComparison(
        selection: DateRangeSelection
      ): DateRangeSelection {
        if (!comparison || params.get(comparisonKey) !== 'previous')
          return selection;
        const selected = { ...selection, comparison: 'previous' as const };

        return variable.valid(selected) ? selected : selection;
      }
      const presetId = params.get(key);
      if (presetId && PRESET_IDS.has(presetId as DatePresetId)) {
        const selection = {
          kind: 'preset',
          id: presetId as DatePresetId,
        } as const;
        if (variable.valid(selection)) return withComparison(selection);
      }
      const start = params.get(startKey);
      const end = params.get(endKey);
      if (start && end) {
        const selection = { kind: 'dates', start, end } as const;
        if (variable.valid(selection)) return withComparison(selection);
      }

      return withComparison(defaultValue);
    },
    write(value) {
      return {
        ...(same(value, defaultValue)
          ? { [key]: null, [startKey]: null, [endKey]: null }
          : value.kind === 'preset'
            ? { [key]: value.id, [startKey]: null, [endKey]: null }
            : { [key]: null, [startKey]: value.start, [endKey]: value.end }),
        ...(comparison ? { [comparisonKey]: value.comparison ?? null } : {}),
      };
    },
  };
  invariant(
    variable.valid(defaultValue),
    `Date variable ${key} has a default outside its available data range.`
  );

  return variable;
}

export type QueryVariable<
  Definition extends QueryVariableDefinition = QueryVariableDefinition,
> = AppVariable<
  QueryVariableValues<readonly [Definition]>[Definition['name']],
  'query'
> & { definition: Definition };

/** Adapt the frontend variable contract to existing URL state and generated view controls. */
export function queryVariable<const Definition extends QueryVariableDefinition>(
  definition: Definition,
  {
    key,
    label = key,
    history = 'push',
  }: { key: string; label?: string; history?: HistoryMode }
): QueryVariable<Definition> {
  defineQueryVariables([definition]);
  const defaultValue = parseQueryVariable(
    definition,
    undefined
  ) as QueryVariable<Definition>['defaultValue'];
  function parse(value: unknown) {
    return parseQueryVariable(definition, value) as typeof defaultValue;
  }
  return {
    kind: 'query',
    definition,
    label,
    history,
    urlKeys: [key],
    defaultValue,
    read(params) {
      const value = params.get(key);
      if (value === null) return defaultValue;
      try {
        return parse(JSON.parse(value));
      } catch {
        return defaultValue;
      }
    },
    write(value) {
      return {
        [key]:
          JSON.stringify(value) === JSON.stringify(defaultValue)
            ? null
            : JSON.stringify(value),
      };
    },
    valid(value) {
      try {
        parse(value);
        return true;
      } catch {
        return false;
      }
    },
    same(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    },
  };
}

import { parseAbsolute } from '@internationalized/date';
import { invariant } from '@/src/core/invariant';

/** Built-in types from the Altertable frontend's VariableValueType contract. */
export const variableValueTypes = [
  'STRING',
  'INTEGER',
  'FLOAT',
  'BOOLEAN',
  'INTERVAL',
  'DURATION',
  'DATETIME',
  'DATETIMERANGE',
] as const;
export type VariableValueType = (typeof variableValueTypes)[number];
export const histogramIntervals = [
  'HOURLY',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
] as const;
export type HistogramInterval = (typeof histogramIntervals)[number];
export const durationUnits = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const;
export type DurationUnit = (typeof durationUnits)[number];
export const relativeUnits = ['SECOND', 'MINUTE', ...durationUnits] as const;
export type RelativeUnit = (typeof relativeUnits)[number];
export const relativeAnchors = [
  'RELATIVE_ANCHOR_NOW',
  'RELATIVE_ANCHOR_START_OF_TODAY',
  'RELATIVE_ANCHOR_START_OF_YESTERDAY',
  'RELATIVE_ANCHOR_START_OF_TOMORROW',
  'RELATIVE_ANCHOR_START_OF_WEEK',
  'RELATIVE_ANCHOR_START_OF_MONTH',
  'RELATIVE_ANCHOR_START_OF_YEAR',
] as const;
export type RelativeAnchor = (typeof relativeAnchors)[number];
export type Duration = { amount: number; unit: DurationUnit };
export type RelativeOffset = { amount: number; unit: RelativeUnit };
export type RelativeDateTime = {
  anchor: RelativeAnchor;
  offset: RelativeOffset[];
};
export type AbsoluteOrRelativeDateTime = Date | RelativeDateTime;
export type DateTimeRange = {
  from?: AbsoluteOrRelativeDateTime | null;
  to?: AbsoluteOrRelativeDateTime | null;
};
export type VariableValues = {
  STRING: string;
  INTEGER: number;
  FLOAT: number;
  BOOLEAN: boolean;
  INTERVAL: HistogramInterval;
  DURATION: Duration;
  DATETIME: AbsoluteOrRelativeDateTime;
  DATETIMERANGE: DateTimeRange;
};
export type VariableValue<Type extends VariableValueType = VariableValueType> =
  VariableValues[Type];
export type QueryVariableDefinition<
  Type extends VariableValueType = VariableValueType,
> = {
  [Key in Type]: {
    name: string;
    type: Key;
    options?: readonly (VariableValue<Key> | null)[];
  } & (
    | { nullable: true; default: VariableValue<Key> | null }
    | { nullable: false; default: VariableValue<Key> }
  );
}[Type];
export type QueryVariableDefinitions = readonly QueryVariableDefinition[];
export type QueryVariableValues<Definitions extends QueryVariableDefinitions> =
  {
    [Definition in Definitions[number] as Definition['name']]:
      | VariableValue<Definition['type']>
      | (Definition extends { nullable: true } ? null : never);
  };
export type QueryVariableBinding = {
  [Type in VariableValueType]: {
    type: Type;
    value: VariableValue<Type> | null;
  };
}[VariableValueType];
export type QueryVariableBindings = Record<string, QueryVariableBinding>;

function record(value: unknown): asserts value is Record<string, unknown> {
  invariant(
    !!value && typeof value === 'object' && !Array.isArray(value),
    'Expected a variable object.'
  );
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  invariant(
    Object.keys(value).every(key => allowed.includes(key)),
    'Unknown variable field.'
  );
}
function dateTime(value: unknown): AbsoluteOrRelativeDateTime {
  if (value instanceof Date) {
    invariant(Number.isFinite(value.getTime()), 'Invalid date.');
    return new Date(value);
  }
  if (typeof value === 'string') {
    invariant(
      /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(
        value
      ),
      'Use an ISO timestamp with a timezone.'
    );
    const date = parseAbsolute(value, 'UTC').toDate();
    invariant(Number.isFinite(date.getTime()), 'Invalid date.');
    return date;
  }
  record(value);
  keys(value, ['anchor', 'offset']);
  invariant(
    relativeAnchors.includes(value.anchor as RelativeAnchor) &&
      Array.isArray(value.offset) &&
      value.offset.length <= 32,
    'Invalid relative date.'
  );
  return {
    anchor: value.anchor as RelativeAnchor,
    offset: (value.offset as unknown[]).map(offset => {
      record(offset);
      keys(offset, ['amount', 'unit']);
      invariant(
        Number.isSafeInteger(offset.amount) &&
          relativeUnits.includes(offset.unit as RelativeUnit),
        'Invalid date offset.'
      );
      return {
        amount: offset.amount as number,
        unit: offset.unit as RelativeUnit,
      };
    }),
  };
}

/** Parses JSON dates back to frontend values; never coerces strings into numbers or booleans. */
export function parseVariableValue<Type extends VariableValueType>(
  type: Type,
  value: unknown
): VariableValue<Type> {
  let parsed: VariableValue;
  switch (type) {
    case 'STRING':
      invariant(
        typeof value === 'string' && !value.includes('\0'),
        'Expected text without NUL characters.'
      );
      parsed = value;
      break;
    case 'INTEGER':
      invariant(Number.isSafeInteger(value), 'Expected a safe integer.');
      parsed = value as number;
      break;
    case 'FLOAT':
      invariant(
        typeof value === 'number' && Number.isFinite(value),
        'Expected a finite number.'
      );
      parsed = value;
      break;
    case 'BOOLEAN':
      invariant(typeof value === 'boolean', 'Expected a boolean.');
      parsed = value;
      break;
    case 'INTERVAL':
      invariant(
        histogramIntervals.includes(value as HistogramInterval),
        'Invalid interval.'
      );
      parsed = value as HistogramInterval;
      break;
    case 'DURATION':
      record(value);
      keys(value, ['amount', 'unit']);
      invariant(
        Number.isSafeInteger(value.amount) &&
          durationUnits.includes(value.unit as DurationUnit),
        'Invalid duration.'
      );
      parsed = {
        amount: value.amount as number,
        unit: value.unit as DurationUnit,
      };
      break;
    case 'DATETIME':
      parsed = dateTime(value);
      break;
    case 'DATETIMERANGE':
      record(value);
      keys(value, ['from', 'to']);
      parsed = {
        from: value.from == null ? null : dateTime(value.from),
        to: value.to == null ? null : dateTime(value.to),
      };
      break;
    default:
      throw new Error('Unsupported variable type.');
  }
  return parsed as VariableValue<Type>;
}

export function parseQueryVariable(
  definition: QueryVariableDefinition,
  value: unknown
): VariableValue | null {
  if (value === undefined) value = definition.default;
  invariant(
    value !== undefined && (value !== null || definition.nullable === true),
    'Missing required variable value.'
  );
  const parsed =
    value === null ? null : parseVariableValue(definition.type, value);
  if (definition.options)
    invariant(
      definition.options.some(
        option =>
          JSON.stringify(
            option === null ? null : parseVariableValue(definition.type, option)
          ) === JSON.stringify(parsed)
      ),
      'Value is outside the variable options.'
    );
  return parsed;
}

export function defineQueryVariables<
  const Definitions extends QueryVariableDefinitions,
>(definitions: Definitions): Definitions {
  invariant(Array.isArray(definitions), 'Expected a variable list.');
  const names = new Set<string>();
  for (const definition of definitions as QueryVariableDefinitions) {
    record(definition);
    const { name } = definition;
    invariant(
      typeof name === 'string' && !names.has(name),
      'Duplicate or missing variable name.'
    );
    names.add(name);
    invariant(
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) &&
        !['table', '__proto__', 'constructor', 'prototype'].includes(name),
      'Invalid or reserved variable name.'
    );
    record(definition);
    keys(definition, ['name', 'type', 'default', 'nullable', 'options']);
    invariant(
      variableValueTypes.includes(definition.type) &&
        typeof definition.nullable === 'boolean' &&
        Object.hasOwn(definition, 'default') &&
        definition.default !== undefined,
      'Invalid variable definition.'
    );
    if (definition.options !== undefined) {
      invariant(
        Array.isArray(definition.options) && definition.options.length > 0,
        'Variable options must be nonempty.'
      );
      const options = definition.options.map(option =>
        parseQueryVariable(
          {
            name,
            default: option,
            type: definition.type,
            nullable: definition.nullable,
          } as QueryVariableDefinition,
          option
        )
      );
      invariant(
        new Set(options.map(option => JSON.stringify(option))).size ===
          options.length,
        'Variable options must be unique.'
      );
    }
    parseQueryVariable(definition, definition.default);
  }
  return definitions;
}

export function parseQueryVariables<
  const Definitions extends QueryVariableDefinitions,
>(definitions: Definitions, value: unknown): QueryVariableValues<Definitions> {
  defineQueryVariables(definitions);
  record(value);
  invariant(
    Object.keys(value).every(name =>
      definitions.some(definition => definition.name === name)
    ),
    'Unknown query variable.'
  );
  return Object.fromEntries(
    definitions.map(definition => [
      definition.name,
      parseQueryVariable(definition, value[definition.name]),
    ])
  ) as QueryVariableValues<Definitions>;
}

export function bindQueryVariables(
  definitions: QueryVariableDefinitions,
  value: unknown
): QueryVariableBindings {
  const parsed = parseQueryVariables(definitions, value);
  return Object.fromEntries(
    definitions.map(definition => [
      definition.name,
      { type: definition.type, value: parsed[definition.name] },
    ])
  ) as QueryVariableBindings;
}

import {
  dimensionFilter,
  parseFacetOptions,
  type DimensionSettings,
  type DimensionVariable,
  type DimensionValue,
  type DimensionSelection,
} from '@/src/core/dimension';
import type {
  AppVariableValues,
  VariableCollection,
} from '@/src/core/variables';
import { invariant } from '@/src/core/invariant';
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

type Source = { query: string; queries: QueryDefinitions };
const sources = new WeakMap<object, Source>();
const parserVariables = new WeakMap<Function, VariableCollection>();
const selectorsKey = Symbol.for('@altertable/data-app/dimension-selectors');
const ownerKey = Symbol.for('@altertable/data-app/dimension-selector-owner');
const invalidMemberKey = Symbol.for(
  '@altertable/data-app/dimension-member-error'
);
type WithSelectors = DataOperation<any, any> & {
  [selectorsKey]?: DataOperations;
  [ownerKey]?: object;
};
export class DimensionMembershipError extends Error {
  readonly [invalidMemberKey] = true;
  static [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [invalidMemberKey]?: unknown })[invalidMemberKey] === true
    );
  }
}

/** Validate named variable values at the operation boundary. Date inputs belong to the base parser. */
export function variableInput<
  Input extends object,
  const Variables extends VariableCollection,
>(
  parse: (value: unknown) => Input,
  variables: Variables & {
    [Key in keyof Variables]: Variables[Key] extends { kind: 'dateRange' }
      ? never
      : Variables[Key];
  }
): (value: unknown) => Input & AppVariableValues<Variables> {
  const previous = parserVariables.get(parse) ?? {};
  const definitions = { ...variables };
  for (const [name, variable] of Object.entries(definitions))
    invariant(
      !previous[name] || previous[name] === variable,
      `Variable input ${name} is already declared.`
    );
  function parser(value: unknown) {
    invariant(
      value && typeof value === 'object' && !Array.isArray(value),
      'Expected variable input.'
    );
    const input = parse(value);
    invariant(
      input && typeof input === 'object' && !Array.isArray(input),
      'Expected parsed input object.'
    );
    const values: Record<string, unknown> = {};
    for (const [name, variable] of Object.entries(definitions)) {
      const selected = (value as Record<string, unknown>)[name];
      invariant(
        variable.valid(selected as never),
        `Invalid ${variable.label ?? name}.`
      );
      values[name] = selected;
    }
    return { ...input, ...values } as Input & AppVariableValues<Variables>;
  }
  parserVariables.set(parser, {
    ...previous,
    ...definitions,
  });
  return parser;
}

export type DimensionSourceConfig<Type extends 'string' | 'number'> =
  DimensionSettings & {
    allowMissing?: false;
    valueType: Type;
    source: { query: string };
  };
/** A query supplies independent options and exact member lookup; it declares a nullable `member` parameter. */
export function bindDimensionSource<const Type extends 'string' | 'number'>(
  config: DimensionSourceConfig<Type>,
  queries: QueryDefinitions
): DimensionVariable<{ string: string; number: number }[Type]> {
  invariant(
    !config.allowMissing,
    'Source dimensions require concrete members.'
  );
  const query = queries[config.source.query];
  invariant(
    query && Object.hasOwn(query.params, 'member'),
    'Dimension sources must declare member.'
  );
  const operation = `__dimension:${config.key}`;
  const variable = dimensionFilter<any>({
    ...config,
    facet: { operation, input: () => ({ member: null }) },
  });
  variable.lookup = { operation };
  sources.set(variable, { query: config.source.query, queries });
  return variable;
}

type Query = (
  name: string,
  params: QueryParameters,
  options: { limit: number }
) => Promise<QueryResult>;
async function loadOptions(
  variable: DimensionVariable<any>,
  member: DimensionValue | null,
  query: Query
) {
  const source = sources.get(variable)!;
  const result = await query(
    source.query,
    { member },
    { limit: member === null ? 200 : 2 }
  );
  const names = result.columns.map(column => column.name);
  invariant(
    new Set(names).size === names.length &&
      names.includes('value') &&
      names.includes('label'),
    'Dimension source must return value and label.'
  );
  const options = parseFacetOptions(
    result.rows.map(row => {
      invariant(row.length === names.length, 'Invalid dimension source row.');
      return {
        value: row[names.indexOf('value')],
        label: row[names.indexOf('label')],
        ...(names.includes('count')
          ? { count: row[names.indexOf('count')] }
          : {}),
      };
    }),
    variable
  );
  if (member !== null && (options.length !== 1 || options[0]!.value !== member))
    throw new DimensionMembershipError(`Invalid ${variable.label} member.`);
  return options;
}
export async function validateVariableInput(
  parser: Function,
  input: unknown,
  query: Query
) {
  for (const [name, variable] of Object.entries(
    parserVariables.get(parser) ?? {}
  )) {
    if (variable.kind !== 'dimension' || !sources.has(variable)) continue;
    const selection = (input as Record<string, DimensionSelection>)[name]!;
    if (selection.kind === 'all') continue;
    for (const member of selection.members)
      if (member.kind === 'value')
        await loadOptions(variable, member.value, query);
  }
}
export function attachDimensionSelectors(
  operation: DataOperation<any, any>,
  queries: QueryDefinitions
) {
  const selectors: DataOperations = {};
  for (const variable of Object.values(
    parserVariables.get(operation.input) ?? {}
  )) {
    if (variable.kind !== 'dimension') continue;
    const source = sources.get(variable);
    if (!source) continue;
    invariant(
      JSON.stringify(source.queries[source.query]) ===
        JSON.stringify(queries[source.query]),
      'Dimension sources must belong to the operation query registry.'
    );
    const name = variable.lookup!.operation;
    invariant(
      !selectors[name] ||
        (selectors[name] as WithSelectors)[ownerKey] === variable,
      'Dimension source keys must be unique across the app.'
    );
    selectors[name] = {
      input(value: unknown) {
        invariant(
          value && typeof value === 'object',
          'Invalid dimension request.'
        );
        const member = (value as { member: unknown }).member;
        invariant(
          member === null ||
            variable.valid({
              kind: 'include',
              members: [{ kind: 'value', value: member as DimensionValue }],
            }),
          'Invalid requested member.'
        );
        return { member: member as DimensionValue | null };
      },
      checks: [{ member: null }],
      policy: {
        maxDurationMs: 15000,
        maxQueryRows: 200,
        maxResponseBytes: 1000000,
      },
      queryNames: { [source.query]: source.query },
      async run(context, input: { member: DimensionValue | null }) {
        return loadOptions(variable, input.member, (name, params, options) => {
          const definition = queries[name]!;
          return context.lakehouse.queryAll(definition.statement, {
            name,
            params: resolveQueryParameters(
              definition.params,
              params,
              context.queryParams ?? {}
            ),
            limit: options.limit,
            signal: context.signal,
          });
        });
      },
    } as DataOperation<any, any>;
    Object.defineProperty(selectors[name]!, ownerKey, { value: variable });
  }
  Object.defineProperty(operation, selectorsKey, { value: selectors });
}
export function withDimensionSelectors<Operations extends DataOperations>(
  operations: Operations
): Operations {
  const expanded: DataOperations = { ...operations };
  for (const operation of Object.values(operations))
    for (const [name, selector] of Object.entries(
      (operation as WithSelectors)[selectorsKey] ?? {}
    )) {
      invariant(
        !Object.hasOwn(operations, name),
        'Reserved dimension operation name.'
      );
      invariant(
        !expanded[name] ||
          (expanded[name] as WithSelectors)[ownerKey] ===
            (selector as WithSelectors)[ownerKey],
        'Dimension source keys must be unique across the app.'
      );
      expanded[name] ??= selector;
    }
  return expanded as Operations;
}

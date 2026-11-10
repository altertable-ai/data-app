import type { FilterCollection } from './app-filters.ts';
import {
  createDimensionFilter,
  parseFacetOptions,
  type DimensionSettings,
  type DimensionSelectionFilter,
  type DimensionValue,
  type DimensionSelection,
} from './dimension.ts';
import { invariant } from './invariant.ts';
import type {
  DataOperation,
  DataOperations,
  QueryResult,
} from './operation-types.ts';
import {
  decodeQueryResult,
  resolveQueryParameters,
  type QueryDefinitions,
  type QueryParameters,
} from './queries.ts';

type Source = { query: string; queries: QueryDefinitions };
export const dimensionSource = Symbol('data-app.dimensionSource');
export type SourceDimensionFilter<Value extends DimensionValue> =
  DimensionSelectionFilter<Value> & {
    readonly optionsSource: 'query';
    readonly [dimensionSource]: { readonly operation: string };
  };
const sources = new WeakMap<object, Source>();
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
  static override [Symbol.hasInstance](value: unknown): boolean {
    return (
      value instanceof Error &&
      (value as { [invalidMemberKey]?: unknown })[invalidMemberKey] === true
    );
  }
}

export type DimensionSourceConfig<Type extends 'string' | 'number'> =
  DimensionSettings & {
    allowMissing?: false;
    valueType: Type;
    source: { query: string };
  };
export type DimensionSourceQueryName<
  Queries extends QueryDefinitions,
  Type extends 'string' | 'number',
> = {
  [Name in keyof Queries & string]: Queries[Name] extends {
    params: { member: { type: Type; nullable: true } };
    projections: {
      value: { type: Type; nullable?: false };
      label: { type: 'string'; nullable?: false };
    };
  }
    ? 'count' extends keyof Queries[Name]['projections']
      ? Queries[Name]['projections']['count'] extends {
          type: 'number';
          nullable?: false;
        }
        ? Name
        : never
      : Name
    : never;
}[keyof Queries & string];
/** A query supplies independent options and exact member lookup; it declares a nullable `member` parameter. */
export function bindDimensionSource<const Type extends 'string' | 'number'>(
  config: DimensionSourceConfig<Type>,
  queries: QueryDefinitions
): SourceDimensionFilter<{ string: string; number: number }[Type]> {
  invariant(
    !config.allowMissing,
    'Source dimensions require concrete members.'
  );
  const query = queries[config.source.query];
  invariant(
    query && Object.hasOwn(query.params, 'member'),
    'Dimension sources must declare member.'
  );
  const member = query.params.member!;
  const { value, label, count } = query.projections;
  invariant(
    member.type === config.valueType &&
      member.nullable === true &&
      value?.type === config.valueType &&
      value.nullable !== true &&
      label?.type === 'string' &&
      label.nullable !== true &&
      (!count || (count.type === 'number' && count.nullable !== true)),
    'Dimension sources require a matching nullable member and concrete value, label, and count projections.'
  );
  const operation = `__dimension:${config.key}`;
  const filter = Object.assign(
    createDimensionFilter<{ string: string; number: number }[Type]>(
      {
        ...config,
        valueType: config.valueType as unknown as {
          string: string;
          number: number;
        }[Type] extends number
          ? 'number'
          : 'string',
        options: [],
      },
      true
    ),
    {
      optionsSource: 'query' as const,
      [dimensionSource]: Object.freeze({ operation }),
    }
  );
  sources.set(filter, { query: config.source.query, queries });
  return filter;
}

type Query = (
  name: string,
  params: QueryParameters,
  options: { limit: number }
) => Promise<QueryResult<Record<string, unknown>>>;
async function loadOptions(
  filter: DimensionSelectionFilter<any>,
  member: DimensionValue | null,
  query: Query
) {
  const source = sources.get(filter)!;
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
  const options = parseFacetOptions(result.rows, filter);
  if (member !== null && (options.length !== 1 || options[0]!.value !== member))
    throw new DimensionMembershipError(`Invalid ${filter.label} member.`);
  return options;
}
/** Source dimension selections must name members the source query returns. */
export async function validateSourceMembers(
  filters: FilterCollection,
  input: unknown,
  query: Query
) {
  for (const [name, filter] of Object.entries(filters)) {
    if (filter.kind !== 'dimension' || !sources.has(filter)) continue;
    const selection = (input as Record<string, DimensionSelection>)[name]!;
    if (selection.kind === 'all') continue;
    for (const member of selection.members)
      if (member.kind === 'value')
        await loadOptions(filter, member.value, query);
  }
}
export function attachDimensionSelectors(
  operation: DataOperation<any, any>,
  queries: QueryDefinitions
) {
  const selectors: DataOperations = {};
  for (const filter of Object.values(operation.filters ?? {})) {
    if (filter.kind !== 'dimension' || !(dimensionSource in filter)) continue;
    const source = sources.get(filter);
    if (!source) continue;
    invariant(
      JSON.stringify(source.queries[source.query]) ===
        JSON.stringify(queries[source.query]),
      'Dimension sources must belong to the operation query registry.'
    );
    const name = filter[dimensionSource].operation;
    invariant(
      !selectors[name] ||
        (selectors[name] as WithSelectors)[ownerKey] === filter,
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
            filter.valid({
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
        return loadOptions(
          filter,
          input.member,
          async (name, params, options) => {
            const definition = queries[name]!;
            const result = await context.lakehouse.queryAll(
              definition.statement,
              {
                name,
                params: resolveQueryParameters(
                  definition.params,
                  params,
                  context.queryParams ?? {}
                ),
                limit: options.limit,
                signal: context.signal,
              }
            );
            return decodeQueryResult(result, definition.projections);
          }
        );
      },
    } as DataOperation<any, any>;
    Object.defineProperty(selectors[name]!, ownerKey, { value: filter });
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

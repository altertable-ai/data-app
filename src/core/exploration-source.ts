import {
  explorationVariable,
  type ExplorationLevel,
  type ExplorationState,
  type ExplorationVariable,
} from '@/src/core/exploration';
import { parseFacetOptions, type DimensionValue } from '@/src/core/dimension';
import {
  resolveQueryParameters,
  type QueryDefinitions,
  type QueryParameters,
} from '@/src/core/queries';
import {
  InputValidationError,
  type DataOperation,
  type OperationInputParser,
  type QueryResult,
} from '@/src/core/operation-types';
import { invariant } from '@/src/core/invariant';

type SourceName<Queries extends QueryDefinitions> = {
  [Name in keyof Queries]: 'member' extends keyof Queries[Name]['params']
    ? Name
    : never;
}[keyof Queries] &
  string;
type Source<Queries extends QueryDefinitions> = {
  [Name in SourceName<Queries>]: {
    query: Name;
    /** Override parameter-to-ancestor bindings only when their names differ. Member is platform-owned. */
    parents?: Partial<
      Record<Exclude<keyof Queries[Name]['params'], 'member'>, string>
    >;
  };
}[SourceName<Queries>];
export type SourcedExplorationLevel<Queries extends QueryDefinitions> =
  | Extract<ExplorationLevel, { options: readonly unknown[] }>
  | {
      id: string;
      label: string;
      groupLabel?: string;
      valueType: 'string' | 'number';
      source: Source<Queries>;
      options?: never;
      facet?: never;
    };
type AncestorIds<
  Levels extends readonly { id: string }[],
  Current extends string,
> = Levels extends readonly [
  infer Head extends { id: string },
  ...infer Tail extends readonly { id: string }[],
]
  ? Head['id'] extends Current
    ? never
    : Head['id'] | AncestorIds<Tail, Current>
  : never;
export type CheckedSourceLevels<
  Queries extends QueryDefinitions,
  Levels extends readonly SourcedExplorationLevel<Queries>[],
> = {
  [Index in keyof Levels]: Levels[Index] extends {
    id: infer Id extends string;
    source: { query: infer Name extends keyof Queries; parents: infer Parents };
  }
    ? {
        source: {
          parents: {
            [Param in keyof Parents]: Param extends Exclude<
              keyof Queries[Name]['params'],
              'member'
            >
              ? Parents[Param] extends AncestorIds<Levels, Id>
                ? Parents[Param]
                : never
              : never;
          };
        };
      }
    : unknown;
};
type NormalizedLevel<Level> = Level extends { source: unknown }
  ? Omit<Level, 'source' | 'options'> & {
      facet: NonNullable<ExplorationLevel['facet']>;
    }
  : Level;
type NormalizedLevels<Levels extends readonly unknown[]> = {
  [Index in keyof Levels]: NormalizedLevel<Levels[Index]>;
} & readonly ExplorationLevel[];
export type SourcedExploration<
  Key extends string,
  Levels extends readonly SourcedExplorationLevel<any>[],
> = ExplorationVariable<NormalizedLevels<Levels>> & {
  /** Generated selector operations; register once with the app's operations. */
  operations: {
    [
      Level in Levels[number] as Level extends { source: unknown }
        ? `${Key}.${Level['id']}`
        : never
    ]: DataOperation<
      Record<string, DimensionValue | null>,
      { value: DimensionValue; label: string; count?: number }[]
    >;
  };
  /** Adds the named hierarchy field and attaches authoritative membership validation to the parser. */
  input: <Base extends object>(
    parseBase: (value: unknown) => Base
  ) => OperationInputParser<
    Omit<Base, Key> & Record<Key, ExplorationState<NormalizedLevels<Levels>>>
  >;
};

/** One registered source query supplies both bounded options and exact membership checks. */
export function defineSourcedExploration<
  Queries extends QueryDefinitions,
  const Key extends string,
  const Levels extends readonly SourcedExplorationLevel<Queries>[],
>(
  queries: Queries,
  definition: {
    key: Key;
    label: string;
    levels: Levels & CheckedSourceLevels<Queries, Levels>;
  }
): SourcedExploration<Key, Levels> {
  const { key, levels } = definition;
  invariant(
    levels.every(
      level => 'source' in level || ('options' in level && level.options)
    ),
    'App-bound exploration levels require options or a registered source.'
  );
  const sources = levels.flatMap((level, position) =>
    'source' in level && level.source
      ? [{ level, position, source: level.source }]
      : []
  );
  for (const { position, source } of sources) {
    for (const [parameter, ancestor] of Object.entries(source.parents ?? {})) {
      invariant(
        parameter !== 'member' &&
          Object.hasOwn(queries[source.query]!.params, parameter) &&
          levels.slice(0, position).some(level => level.id === ancestor),
        'Source parent bindings must reference earlier hierarchy levels and declared parameters.'
      );
    }
  }
  const validationQueries: QueryDefinitions = Object.fromEntries(
    sources.map(({ source }) => {
      const query = queries[source.query];
      invariant(
        query && Object.hasOwn(query.params, 'member'),
        'Exploration source queries must declare a member parameter.'
      );
      return [source.query, query];
    })
  );
  function parents(state: ExplorationState<any>, position: number) {
    return Object.fromEntries(
      levels.slice(0, position).map((level, index) => {
        const selection = (state as ExplorationState<any>).selection[level.id];
        return [
          level.id,
          index < position && selection.kind === 'include'
            ? selection.members[0].value
            : null,
        ];
      })
    );
  }
  function parameters(
    source: Source<Queries>,
    ancestors: Record<string, DimensionValue | null>,
    member: DimensionValue | null
  ): QueryParameters {
    const params: Record<string, DimensionValue | null> = { member };
    for (const parameter of Object.keys(queries[source.query]!.params)) {
      if (parameter === 'member') continue;
      const ancestor =
        (source.parents as Record<string, string> | undefined)?.[parameter] ??
        parameter;
      if (Object.hasOwn(ancestors, ancestor))
        params[parameter] = ancestors[ancestor]!;
    }
    return params;
  }
  const normalized = levels.map(level => {
    if (!('source' in level) || !level.source) return level;
    return {
      id: level.id,
      label: level.label,
      groupLabel: level.groupLabel,
      valueType: level.valueType,
      facet: {
        operation: `${key}.${level.id}`,
        input: (selection: Record<string, any>) =>
          Object.fromEntries(
            levels.map(entry => {
              const selected = selection[entry.id];
              return [
                entry.id,
                selected?.kind === 'include' ? selected.members[0].value : null,
              ];
            })
          ),
      },
    };
  }) as NormalizedLevels<Levels>;
  const variable = explorationVariable({ ...definition, levels: normalized });
  const operations: Record<
    string,
    DataOperation<
      Record<string, DimensionValue | null>,
      { value: DimensionValue; label: string; count?: number }[]
    >
  > = {};
  for (const { level, position, source } of sources) {
    operations[`${key}.${level.id}`] = {
      input(value: unknown) {
        invariant(
          value && typeof value === 'object' && !Array.isArray(value),
          'Expected exploration ancestors.'
        );
        const raw = value as Record<string, unknown>;
        return Object.fromEntries(
          levels.map((entry, index) => {
            const selected = index < position ? raw[entry.id] : null;
            invariant(
              selected === null ||
                (typeof selected === entry.valueType &&
                  (typeof selected !== 'number' || Number.isFinite(selected))),
              'Invalid exploration ancestor.'
            );
            return [entry.id, selected as DimensionValue | null];
          })
        );
      },
      output: value => parseFacetOptions(value, variable.dimensions[position]!),
      checks: [Object.fromEntries(levels.map(entry => [entry.id, null]))],
      queryNames: { [source.query]: source.query },
      policy: { maxQueryRows: 200, maxDurationMs: 15000 },
      async run(context, ancestors) {
        const query = queries[source.query]!;
        const result = await context.lakehouse.queryAll(query.statement, {
          name: source.query,
          params: resolveQueryParameters(
            query.params,
            parameters(
              source,
              Object.fromEntries(
                Object.entries(ancestors).filter(([name]) =>
                  levels.slice(0, position).some(level => level.id === name)
                )
              ),
              null
            ),
            context.queryParams ?? {}
          ),
          limit: 200,
          signal: context.signal,
        });
        return options(result, position);
      },
    };
  }
  function options(result: QueryResult, position: number) {
    const valueIndex = result.columns.findIndex(
      column => column.name === 'value'
    );
    const labelIndex = result.columns.findIndex(
      column => column.name === 'label'
    );
    const countIndex = result.columns.findIndex(
      column => column.name === 'count'
    );
    invariant(
      valueIndex >= 0 && labelIndex >= 0,
      'Exploration source queries must return value and label columns.'
    );
    return parseFacetOptions(
      result.rows.map(row => ({
        value: row[valueIndex],
        label: row[labelIndex],
        ...(countIndex >= 0 ? { count: row[countIndex] } : {}),
      })),
      variable.dimensions[position]!
    );
  }
  return Object.assign(variable, {
    operations,
    input<Base extends object>(parseBase: OperationInputParser<Base>) {
      const parse = ((value: unknown) => {
        invariant(
          value && typeof value === 'object' && !Array.isArray(value),
          'Expected operation input.'
        );
        const base = parseBase(value);
        invariant(
          base &&
            typeof base === 'object' &&
            !Array.isArray(base) &&
            typeof (base as { then?: unknown }).then !== 'function',
          'The base input parser must return a synchronous object.'
        );
        invariant(
          !Object.hasOwn(base, key),
          'The exploration input parser owns its named hierarchy field.'
        );
        return {
          ...base,
          [key]: variable.parse((value as Record<string, unknown>)[key]),
        };
      }) as OperationInputParser<
        Omit<Base, Key> &
          Record<Key, ExplorationState<NormalizedLevels<Levels>>>
      >;
      const inherited = parseBase.validation;
      for (const [name, declaration] of Object.entries(validationQueries)) {
        const prior = inherited?.queries[name];
        invariant(
          !prior ||
            (prior.statement === declaration.statement &&
              JSON.stringify(prior.params) ===
                JSON.stringify(declaration.params)),
          `Conflicting exploration source: ${name}.`
        );
      }
      for (const [name, required] of Object.entries(operations)) {
        invariant(
          !inherited?.operations?.[name] ||
            inherited.operations[name] === required,
          `Conflicting exploration selector operation: ${name}.`
        );
      }
      parse.validation = {
        queries: { ...inherited?.queries, ...validationQueries },
        operations: { ...inherited?.operations, ...operations },
        async run(query, input) {
          await inherited?.run(query, input as Base);
          const state = variable.parse(input[key]);
          for (const { level, position, source } of sources) {
            const selection = (state as ExplorationState<any>).selection[
              level.id
            ];
            if (selection.kind === 'all') continue;
            const member = selection.members[0].value;
            const result = await query(
              source.query,
              parameters(source, parents(state, position), member),
              { limit: 2 }
            );
            const matches = options(result, position);
            if (matches.length !== 1 || matches[0]!.value !== member)
              throw new InputValidationError(
                `The selected ${level.label.toLowerCase()} is not available ${position === 0 ? 'in this scope' : 'within its selected parents'}.`
              );
          }
        },
      };
      return parse;
    },
  }) as SourcedExploration<Key, Levels>;
}

import type { AppearanceOptions } from './appearance.ts';
/**
 * App configuration shared by browser and server.
 * @module @altertable/data-app
 */
import { defineOperation, type OperationDefinition } from './contract.ts';
import {
  bindDimensionSource,
  type DimensionSourceConfig,
  type DimensionSourceQueryName,
  type SourceDimensionVariable,
} from './dimension-source.ts';
import {
  snapshotQueries,
  type QueryDefinitions,
  type CheckedQueries,
  type QuerySnapshot,
} from './queries.ts';
export type {
  QueryDefinitions,
  QueryParameterValue,
  QueryParameter,
  QueryValueType,
  QueryField,
  QueryProjections,
  QueryRow,
} from './queries.ts';

export type DataAppConfig<Queries extends QueryDefinitions = QueryDefinitions> =
  {
    title: string;
    /** Display labels; scope does not grant data access. */
    scope: { organization: string; environment: string };
    /** Explain what the app helps readers explore. */
    description: string;
    /** Omit to use the standard appearance. */
    appearance?: AppearanceOptions;
    /** Shared date display defaults. Reporting views and individual fields may override the time zone. */
    dateFormatting?: { locale?: string; timeZone?: string };
    /** Named SQL statements with typed parameters and result projections. */
    queries: Queries;
  };

/** An app declaration with operations bound to its query registry. */
export type DataAppDefinition<
  Queries extends QueryDefinitions = QueryDefinitions,
> = Readonly<Omit<DataAppConfig<Queries>, 'queries'>> & {
  readonly queries: QuerySnapshot<Queries>;
  defineDimension<const Type extends 'string' | 'number'>(
    config: DimensionSourceConfig<Type> & {
      source: { query: DimensionSourceQueryName<Queries, NoInfer<Type>> };
    }
  ): SourceDimensionVariable<{ string: string; number: number }[Type]>;
  defineOperation<Input, Output>(
    operation: OperationDefinition<Input, Output, Queries>
  ): ReturnType<typeof defineOperation<Input, Output, Queries>>;
};

/**
 * Define the app's query source of truth while preserving exact query and parameter names.
 * Use `app.defineOperation()` to bind operations to these queries. Pass the app once
 * to `mountDataApp({ app, component })` or `<DataAppProvider app={app}>`.
 * The app owns an immutable snapshot of its registry; later input mutations do not change it.
 * This declaration does not execute queries or mount UI. Static apps use `queries: {}`.
 *
 * Declare the app once at module scope using the named import from `@altertable/data-app`.
 * Import aliases are allowed. Prefer a `const` initializer; top-level variable
 * initializers, default exports, and standalone calls are supported.
 * Use literal objects, arrays, strings (including templates without interpolation),
 * finite signed numbers, booleans, and null. Parentheses, `as`, and `satisfies` are
 * allowed. Keep executable composition outside the call; omit spreads, computed keys,
 * references, and callbacks. Extraction reads literals without executing app code.
 * TypeScript and runtime query rules own configuration validation.
 *
 * SQL passes unchanged to the backend, which interprets placeholders such as `$orgId`.
 * Declare each parameter's type and optional defaultValue.
 * Values are finite numbers, strings, booleans, or null, never SQL fragments or identifiers.
 * Host queryParams supply protected values; callers cannot override them.
 */
export function defineDataApp<const Queries extends QueryDefinitions>(
  config: DataAppConfig<Queries> & { queries: CheckedQueries<Queries> }
): DataAppDefinition<Queries> {
  const queries = snapshotQueries<Queries>(config.queries);
  return Object.freeze({
    ...config,
    queries,
    defineDimension<const Type extends 'string' | 'number'>(
      config: DimensionSourceConfig<Type> & {
        source: { query: DimensionSourceQueryName<Queries, NoInfer<Type>> };
      }
    ) {
      return bindDimensionSource<Type>(config, queries);
    },
    defineOperation<Input, Output>(
      operation: OperationDefinition<Input, Output, Queries>
    ) {
      return defineOperation<Input, Output, Queries>({
        ...operation,
        queries: queries as unknown as CheckedQueries<Queries>,
      });
    },
  });
}

export function dataAppTitle(
  config: Pick<DataAppConfig, 'title' | 'scope'>
): string {
  return `${config.title} • ${config.scope.organization}/${config.scope.environment} • Altertable app`;
}

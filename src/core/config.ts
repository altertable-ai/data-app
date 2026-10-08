/**
 * App configuration shared by browser and server.
 * @module @altertable/data-app
 */
import { defineOperation } from '@/src/core/contract';
import type { AppearanceOptions } from '@/src/core/appearance';
import { snapshotQueries, type QueryDefinitions } from '@/src/core/queries';
export type { QueryDefinitions, QueryParameterValue } from '@/src/core/queries';

export type DataAppConfig<Queries extends QueryDefinitions = QueryDefinitions> =
  {
    title: string;
    /** Display labels; scope does not grant data access. */
    scope: { organization: string; environment: string };
    /** Explain what the app helps readers explore. */
    description: string;
    /** Omit to use the standard appearance. */
    appearance?: AppearanceOptions;
    /** Named SQL statements and parameter defaults used by app operations. */
    queries: Queries;
  };

type ImmutableQueries<Queries extends QueryDefinitions> = {
  readonly [Name in keyof Queries]: {
    readonly statement: Queries[Name]['statement'];
    readonly params: {
      readonly [Param in keyof Queries[Name]['params']]: Readonly<
        Queries[Name]['params'][Param]
      >;
    };
  };
};

/** An app declaration with operations bound to its query registry. */
export type DataAppDefinition<
  Queries extends QueryDefinitions = QueryDefinitions,
> = Readonly<Omit<DataAppConfig<Queries>, 'queries'>> & {
  readonly queries: ImmutableQueries<Queries>;
  defineOperation<Input, Output>(
    operation: Omit<
      Parameters<typeof defineOperation<Input, Output, Queries>>[0],
      'queries'
    >
  ): ReturnType<typeof defineOperation<Input, Output, Queries>>;
};

/**
 * Define the app's query source of truth while preserving exact query and parameter names.
 * Use `app.defineOperation()` to bind operations to these queries. Pass the app once
 * to `mountDataApp({ app, component })` or `<DataAppProvider app={app}>`.
 * The app owns an immutable snapshot of its registry; later input mutations do not change it.
 * This declaration does not execute queries or mount UI. Static apps use `queries: {}`.
 *
 * Declare exactly one module-level const initialized with `defineDataApp({ ... })` in the app's
 * declaration source. For the future backend extractor, the argument is read before bundling
 * by resolving the named `defineDataApp` import from `@altertable/data-app`, including aliases.
 * Variable name is arbitrary;
 * export only for imports by other modules. The argument must be a direct object literal
 * containing schema-valid objects, arrays, strings (including templates without interpolation),
 * finite signed numbers, booleans, and null. No spreads, computed keys, references, calls,
 * or callbacks inside it. Extraction must validate data without evaluating app code.
 * TypeScript checks the shape, not AST syntax. Keep executable composition outside the call.
 *
 * SQL passes unchanged to the backend, which interprets placeholders such as `$orgId`.
 * Declare every parameter with `{ defaultValue: value }` or `{}` for a required value.
 * Values are finite numbers, strings, booleans, or null, never SQL fragments or identifiers.
 * Caller values override defaults; trusted server `queryParams` cannot be overridden.
 */
export function defineDataApp<const Queries extends QueryDefinitions>(
  config: DataAppConfig<Queries>
): DataAppDefinition<Queries> {
  const queries = snapshotQueries(config.queries) as Queries &
    ImmutableQueries<Queries>;
  return Object.freeze({
    ...config,
    queries,
    defineOperation<Input, Output>(
      operation: Omit<
        Parameters<typeof defineOperation<Input, Output, Queries>>[0],
        'queries'
      >
    ) {
      return defineOperation<Input, Output, Queries>({
        ...operation,
        queries,
      });
    },
  });
}

export function dataAppTitle(
  config: Pick<DataAppConfig, 'title' | 'scope'>
): string {
  return `${config.title} • ${config.scope.organization}/${config.scope.environment} • Altertable app`;
}

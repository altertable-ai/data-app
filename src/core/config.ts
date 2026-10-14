/**
 * App configuration shared by browser and server.
 * @module @altertable/data-app
 */
import {
  defineSourcedHierarchy,
  type SourcedHierarchyLevel,
  type CheckedSourceLevels,
  type SourcedHierarchy,
} from '@/src/core/hierarchy-source';
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
    /** Shared date display defaults. Reporting views and individual fields may override the time zone. */
    dateFormatting?: { locale?: string; timeZone?: string };
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
  defineHierarchy<
    const Key extends string,
    const Levels extends readonly SourcedHierarchyLevel<Queries>[],
  >(definition: {
    key: Key;
    label: string;
    levels: Levels & CheckedSourceLevels<Queries, Levels>;
  }): SourcedHierarchy<Key, Levels>;
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
 * Declare one module-level const with `defineDataApp({ ... })`. Keep its argument a static
 * object literal so tools can extract it without evaluating app code: objects, arrays,
 * strings (including templates without interpolation), finite numbers, booleans, and null.
 * No spreads, computed keys, references, calls, or callbacks inside the declaration.
 * Keep executable composition outside the call. TypeScript checks shape, not this syntax.
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
    defineHierarchy<
      const Key extends string,
      const Levels extends readonly SourcedHierarchyLevel<Queries>[],
    >(definition: {
      key: Key;
      label: string;
      levels: Levels & CheckedSourceLevels<Queries, Levels>;
    }): SourcedHierarchy<Key, Levels> {
      return defineSourcedHierarchy<Queries, Key, Levels>(queries, definition);
    },
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
  }) as DataAppDefinition<Queries>;
}

export function dataAppTitle(
  config: Pick<DataAppConfig, 'title' | 'scope'>
): string {
  return `${config.title} • ${config.scope.organization}/${config.scope.environment} • Altertable app`;
}

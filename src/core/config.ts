/**
 * App configuration shared by browser and server.
 * @module @altertable/data-app
 */
import { defineOperation, type OperationDefinition } from '@/src/core/contract';
import type { AppearanceOptions } from '@/src/core/appearance';
import {
  snapshotQueries,
  type QueryDefinitions,
  type CheckedQueries,
  type QuerySnapshot,
} from '@/src/core/queries';
export type {
  QueryDefinitions,
  QueryParameterValue,
  QueryParameter,
  QueryValueType,
  QueryField,
  QueryProjections,
  QueryRow,
} from '@/src/core/queries';

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
    /** Named SQL statements with typed parameters, ownership, and result projections. */
    queries: Queries;
  };

/** An app declaration with operations bound to its query registry. */
export type DataAppDefinition<
  Queries extends QueryDefinitions = QueryDefinitions,
> = Readonly<Omit<DataAppConfig<Queries>, 'queries'>> & {
  readonly queries: QuerySnapshot<Queries>;
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
 * Declare each parameter's type and source: 'input' or 'context'.
 * Input values are required unless defaultValue is supplied. Context values come only from the host.
 * Values are finite numbers, strings, booleans, or null, never SQL fragments or identifiers.
 * Caller values override input defaults; only context-owned parameters read trusted queryParams.
 */
export function defineDataApp<const Queries extends QueryDefinitions>(
  config: DataAppConfig<Queries> & { queries: CheckedQueries<Queries> }
): DataAppDefinition<Queries> {
  const queries = snapshotQueries<Queries>(config.queries);
  return Object.freeze({
    ...config,
    queries,
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

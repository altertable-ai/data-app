/**
 * App configuration shared by browser and server.
 * @module @altertable/data-app/config
 */
import { defineOperation } from '@/src/core/contract';
import type { AppearanceOptions } from '@/src/core/appearance';
import type { QueryDefinitions } from '@/src/core/queries';
export type { QueryDefinitions, QueryParameterValue } from '@/src/core/queries';

export type DataAppConfig<Queries extends QueryDefinitions = QueryDefinitions> =
  {
    title: string;
    /** Display labels; scope does not grant data access. */
    scope: { organization: string; environment: string };
    appearance: AppearanceOptions;
    /** Named SQL statements and parameter defaults used by app operations. */
    queries: Queries;
  };

/**
 * Define the app's query source of truth while preserving exact query and parameter names.
 * Use `app.defineOperation()` to bind operations to these queries and `app.config`
 * with React and mounting APIs. Static apps use `queries: {}`.
 *
 * Declare `const app = defineDataApp({ ... })` at module top level.
 * For backend AST extraction, pass a direct object literal with literal values throughout:
 * no spreads, computed keys, variable references, calls, or interpolated template strings
 * inside the argument, so the backend can extract it by recognizing the imported
 * `defineDataApp` call, regardless of variable name. Export the app
 * only when another module imports it. TypeScript checks the shape, not AST syntax.
 *
 * SQL passes unchanged to the backend, which interprets placeholders such as `$orgId`.
 * Declare every parameter with `{ defaultValue: value }` or `{}` for a required value.
 * Values are finite numbers, strings, booleans, or null, never SQL fragments or identifiers.
 * Caller values override defaults; trusted server `queryParams` cannot be overridden.
 */
export function defineDataApp<const Queries extends QueryDefinitions>(
  config: DataAppConfig<Queries>
) {
  return {
    config,
    defineOperation<Input, Output>(
      operation: Omit<
        Parameters<typeof defineOperation<Input, Output, Queries>>[0],
        'queries'
      >
    ) {
      return defineOperation<Input, Output, Queries>({
        ...operation,
        queries: config.queries,
      });
    },
  };
}

export function dataAppTitle(
  config: Pick<DataAppConfig, 'title' | 'scope'>
): string {
  return `${config.title} • ${config.scope.organization}/${config.scope.environment} • Altertable app`;
}

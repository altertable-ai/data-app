/**
 * App configuration shared by browser and server.
 * @module @altertable/data-app/config
 */
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
 * Operations use `queries: config.queries`; static apps use `queries: {}`.
 *
 * Declare `const DATA_APP_CONFIG = defineDataAppConfig({ ... })` at module top level.
 * For backend AST extraction, pass a direct object literal with literal values throughout:
 * no spreads, computed keys, variable references, calls, or interpolated template strings
 * inside the config, so the backend can extract this call's argument. Export the config
 * only when another module imports it. TypeScript checks the shape, not AST syntax.
 *
 * SQL passes unchanged to the backend, which interprets placeholders such as `$orgId`.
 * Declare every parameter with `{ defaultValue: value }` or `{}` for a required value.
 * Values are finite numbers, strings, booleans, or null, never SQL fragments or identifiers.
 * Caller values override defaults; trusted server `queryParams` cannot be overridden.
 */
export function defineDataAppConfig<const Queries extends QueryDefinitions>(
  config: DataAppConfig<Queries>
): DataAppConfig<Queries> {
  return config;
}

export function dataAppTitle(
  config: Pick<DataAppConfig, 'title' | 'scope'>
): string {
  return `${config.title} • ${config.scope.organization}/${config.scope.environment} • Altertable app`;
}

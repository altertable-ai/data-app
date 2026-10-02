# Contracts

Import operation definitions, parsers, and shared types from
`@altertable/data-app/contract`. This entry is safe to import in browser and server
modules. For HTTP apps, keep SQL and operation implementations on the server; browser modules
should import their operation types using `import type`.

## Execute named queries

Keep `defineOperation()` and `defineQueryNames()` as the operation boundary. An
operation can run several named SQL queries and parse their results. For hosted
apps, declare their statements in `queries` and their shared variable definitions
in `variables`. The existing query name identifies each registered statement.

```ts
import {
  defineOperation,
  defineQueryNames,
  defineQueryVariables,
  parseQueryVariables,
  getDataAppRegistration,
} from '@altertable/data-app/contract';

const queries = defineQueryNames({ activity: 'feature-activity' });
const variables = defineQueryVariables({
  feature: { type: 'STRING', default: '' },
  interval: { type: 'INTERVAL', default: 'DAILY' },
});
const activity = defineOperation({
  queryNames: queries,
  variables,
  queries: {
    [queries.activity]: `
      SELECT date_trunc('{{interval}}', occurred_at) AS day, count(*) AS count
      FROM events
      WHERE {{feature}} = '' OR feature = {{feature}}
      GROUP BY 1 ORDER BY 1`,
  },
  input: value => parseQueryVariables(variables, value),
  output: parseActivity,
  checks: [{ feature: '', interval: 'DAILY' }],
  policy: { maxQueryRows: 100, maxDurationMs: 15000, exposeSql: true },
  async run({ query }, input) {
    const result = await query(queries.activity, input);
    return parseActivityRows(result);
  },
});
const operations = { activity };
const registration = getDataAppRegistration(operations);
```

The app supplies `parseActivity()` and `parseActivityRows()`. `query()` inherits the
operation's limits and cancellation signal; `{ limit }` can lower a query's row
bound. Names are checked by TypeScript and at runtime. A registered query accepts
variable values, never replacement SQL. The runtime derives dependencies from
placeholders and sends only the referenced variables. An operation can pass its
shared input to several queries without declaring dependencies twice.

`getDataAppRegistration()` returns `{ queries, variables }`, merging the operation
definitions and rejecting conflicting names. **For hosted creation and updates,
submit both complete maps alongside the source for the same app revision.** Include
empty maps when appropriate; updates replace the maps, including removals. The
host/backend stores and validates them through its create/update API. Registration
is not sent by the running iframe. See [hosted authoring](hosted-apps.md).

Local server operations can keep `query(name, statement)` without declaring
`queries`. They can also use the same templates: the Bun adapter constructs SQL
before calling the CLI proxy. HTTP browser modules import operation types with
`import type`; hosted apps import their operation registry as a value.

## Query variables

The supported types and value shapes follow Altertable's frontend variable
contract. `VariableValue<Type>` maps each type to its value;
`QueryVariableValues<typeof variables>` derives an operation input. Definitions
accept `type`, `default`, `nullable`, and `options`. Options must be unique and constrain allowed
values. Missing values use the declared default; explicit null requires
`nullable: true`. Without a default, a value is required. Runtime parsing rejects
unknown names, malformed shapes, non-finite numbers, and numeric/boolean strings.
Custom types and SQL fragments are not supported.

| Type            | TypeScript value             | JSON representation                                           |
| --------------- | ---------------------------- | ------------------------------------------------------------- |
| `STRING`        | `string`                     | String                                                        |
| `INTEGER`       | `number` (safe integer)      | Number                                                        |
| `FLOAT`         | `number` (finite)            | Number                                                        |
| `BOOLEAN`       | `boolean`                    | Boolean                                                       |
| `INTERVAL`      | `HistogramInterval`          | `HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY` |
| `DURATION`      | `Duration`                   | `{ amount: integer, unit: HOUR/DAY/WEEK/MONTH/YEAR }`         |
| `DATETIME`      | `Date` or `RelativeDateTime` | ISO timestamp with timezone, or `{ anchor, offset }`          |
| `DATETIMERANGE` | `DateTimeRange`              | `{ from, to }`, each a datetime or null                       |

`RelativeDateTime` uses the frontend's `RELATIVE_ANCHOR_NOW` and
`RELATIVE_ANCHOR_START_OF_TODAY`, `YESTERDAY`, `TOMORROW`, `WEEK`, `MONTH`, or
`YEAR` anchors (each with the full prefix). `offset` is an ordered array of
`{ amount: integer, unit }`; units are `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`,
`MONTH`, and `YEAR`. Dates serialize to ISO strings across JSON and are parsed
back to `Date` values. Relative selections stay relative.

Use [`queryVariable()` and the selectors](react.md#query-variable-selectors) to
bind these definitions to existing view controls and URL state.

## SQL variable syntax

These placeholders are Altertable syntax, resolved by the query backend. Local
execution uses `buildQueryStatement()` with DuckDB-compatible SQL literals.

| SQL                                      | Behavior                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `country = {{country}}`                  | Insert a typed value; do not add quotes around STRING or DATETIME        |
| `{{equals(country, country)}}`           | Equality, or `country IS NULL` for null                                  |
| `{{not_equals(country, country)}}`       | Inequality, or `country IS NOT NULL` for null                            |
| `{{between(created_at, period)}}`        | DATETIMERANGE predicate with open-bound support                          |
| `created_at BETWEEN {{period}}`          | Inclusive range; absent from/to default to epoch/execution time          |
| `date_trunc('{{interval}}', created_at)` | INTERVAL expands to `hour`, `day`, `week`, `month`, `quarter`, or `year` |
| `created_at > now() - {{duration}}`      | DURATION expands to an SQL interval                                      |

`between()` includes both endpoints when both exist. With only `from`, it uses
`>`; with only `to`, it uses `<`; null or two absent endpoints means `IS NULL`.
Use explicit datetime variables with `>=` and `<` for a half-open reporting range.
SQL comparisons to a plain null placeholder retain normal SQL null semantics.
For optional filters, write the condition explicitly, such as
`{{country}} IS NULL OR country = {{country}}`.

Variable names are identifiers such as `country` and `period`; dotted access,
expressions, array values, and arbitrary identifier substitution are unsupported.
Helper column arguments support fixed, optionally qualified/quoted identifiers.
`INTERVAL` inside a complete quoted placeholder is the one quoting exception.
Placeholders in comments are ignored; placeholders embedded in other strings or
quoted identifiers are rejected. Use standard SQL strings in templates, without
backslash escapes. STRING values are escaped as literals; text search wildcards
still follow SQL LIKE semantics and are not automatically added or removed.

Local construction resolves relative dates against one execution clock in UTC,
with Monday as the start of week. `buildQueryStatement()` accepts an explicit
`timeZone` and `now` for other server contexts. Configure the hosted backend with
the same timezone when comparing local and hosted results.

Template evidence contains the registered statement. The operation response keeps
the exact input and backend query IDs; the iframe does not claim to know the final
SQL produced by the hosted backend. Raw local statement evidence is unchanged.

## Shared date ranges

Use `defineDateRangeContract()` in a browser-safe module to share source coverage,
time zone, maximum range, and comparison rules between the server parser and
React variables. The server uses `calendar.parseRequest()`; React uses the same
contract with `dateRangeVariable()`.

```ts
import { defineDateRangeContract } from '@altertable/data-app/contract';

export const calendar = defineDateRangeContract({
  minDate: '2026-01-01',
  maxRangeDays: 90,
  timeZone: 'UTC',
});
```

`parseEmptyInput()`, `parseTrue()`, `parseCount()`, and `parseDateRangeInput()` validate
common inputs and results. `connectionCheck()` defines a bounded connectivity
operation. A successful connectivity check confirms access; it is not an
analysis result.

See [server authorization](server.md) and [React views](react.md) for the two
sides of an operation.

## Message routes

Message contracts describe the payloads allowed between an embedded app and its
host. Share these contracts with the app; keep handlers and authorization in the
host/server.

Name routes `{scope}:{action}`, for example `data:query` or `navigation:update`.

```ts
import {
  createMessageRouter,
  defineMessageRoute,
  navigationUpdateRoute,
} from '@altertable/data-app/contract';
import { createNavigationHandler } from '@altertable/data-app/embed';

const routes = {
  'demo:echo': defineMessageRoute({ input: parseString, output: parseString }),
  'navigation:update': navigationUpdateRoute,
};
const router = createMessageRouter(routes, {
  'demo:echo': value => value,
  'navigation:update': createNavigationHandler(),
});
```

The app defines `parseString()` to validate unknown values. `router.dispatch()` checks
registered routes, input, output, and cancellation. `MessageRoutingError` exposes
an intentional public code, message, and optional request ID; other handler
errors are replaced with a generic failure.

`defineDataQueryRoute(operationContracts)` validates the selected operation's
input and output and preserves its response evidence. It infers the result type
from the selected operation when used with `createMessageClient()`. Share input and
output parsers, not operation implementations containing SQL or credentials.
`dataAppRoutes` supplies generic `data:query` and `navigation:update` contracts;
generic hosts must delegate operation validation and authorization to their
server. Request handlers receive `{ signal }` for cancellation.

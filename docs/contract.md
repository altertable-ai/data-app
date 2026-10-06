# Contracts

Import operation definitions, parsers, and shared types from
`@altertable/data-app/contract`. This entry is safe to import in browser and server
modules. For HTTP apps, keep SQL and operation implementations on the server; browser modules
should import their operation types using `import type`.

## Execute named queries

Hosted operations call registered query IDs with typed values. For example,
`event-count` can reference `SELECT count(*) FROM events WHERE country = {{country}}`
in the separate query map. See [hosted registration](hosted-apps.md#create-and-update-registration)
for the app's deliverables.

```ts
import {
  defineOperation,
  defineQueryNames,
  type QueryVariableDefinitions,
  type QueryVariableValues,
  parseCount,
} from '@altertable/data-app/contract';

const queryNames = defineQueryNames({ count: 'event-count' });
const variables = [
  { name: 'country', type: 'STRING', nullable: false, default: 'FR' },
] as const satisfies QueryVariableDefinitions;
const operations = {
  eventCount: defineOperation({
    queryNames,
    variables,
    input: value => value as QueryVariableValues<typeof variables>,
    output: parseCount,
    checks: [{ country: 'FR' }],
    policy: { maxQueryRows: 1, maxDurationMs: 15000 },
    async run({ query }, input) {
      const result = await query(queryNames.count, { country: input.country });
      return parseCount(result.rows[0]?.[0]);
    },
  }),
};
```

`query(id, values)` inherits the operation's limit and cancellation signal;
`{ limit }` can lower the row bound. Pass only the variables used by that query.
An operation may execute several named queries. Local server operations keep
`query(id, statement)`; see [local authoring](local-data-apps.md).

## Query variables

Each definition requires `name`, `type`, `nullable`, and a valid `default`.
Names must be unique. Missing values use the default; null requires `nullable: true`. Optional `options`
restrict the selector choices. The backend validates definitions and values,
applies defaults, and resolves SQL placeholders.

`VariableValue<Type>` gives the value type;
`QueryVariableValues<typeof variables>` derives inputs keyed by name.

| Type            | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| `STRING`        | `string`                                                           |
| `INTEGER`       | Safe integer                                                       |
| `FLOAT`         | Finite number                                                      |
| `BOOLEAN`       | `boolean`                                                          |
| `INTERVAL`      | `HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`      |
| `DURATION`      | `{ amount: integer, unit: HOUR/DAY/WEEK/MONTH/YEAR }`              |
| `DATETIME`      | `Date` (ISO timestamp with timezone in JSON) or `RelativeDateTime` |
| `DATETIMERANGE` | `{ from, to }`, each a datetime or null                            |

`RelativeDateTime` is `{ anchor, offset }`. Use `RELATIVE_ANCHOR_NOW` or
`RELATIVE_ANCHOR_START_OF_` followed by `TODAY`, `YESTERDAY`, `TOMORROW`,
`WEEK`, `MONTH`, or `YEAR` for the anchor. `offset` is an ordered array of
`{ amount: integer, unit }`; units are `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`,
`MONTH`, and `YEAR`. Dates serialize to ISO strings across JSON. Relative selections stay relative.

Use [`queryVariable()` and the selectors](react.md#query-variable-selectors) to
bind these definitions to existing view controls and URL state.

## SQL variable syntax

These placeholders are Altertable syntax, resolved by the query backend.

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

Use simple variable names such as `country`; expressions, dotted access, arrays,
and identifier substitution are unsupported. Helper column arguments must be
fixed SQL identifiers, optionally qualified or quoted. Do not quote placeholders
except for the `INTERVAL` example above, or embed them in strings or identifiers.
Use standard SQL strings without backslash escapes. `LIKE` wildcards retain their
SQL meaning. The backend resolves relative dates and timezones at execution time.

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

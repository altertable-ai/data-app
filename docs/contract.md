# Contracts

Import operation definitions, parsers, and shared types from
`@altertable/data-app/contract`. This entry is safe to import in browser and server
modules. For HTTP apps, keep SQL and operation implementations on the server; browser modules
should import their operation types using `import type`.

## Execute named queries

Operations call registered query IDs with parameter values. Each app keeps its SQL
in a `queries.json` map that uses DuckDB prepared-statement parameters:
`event-count` can reference `SELECT count(*) FROM events WHERE country = $country`.
See [hosted registration](hosted-apps.md#create-and-update-registration) and the
[local Bun server](server-bun.md) for where the map is read.

```ts
import {
  defineOperation,
  defineQueryNames,
  parseCount,
} from '@altertable/data-app/contract';

const queryNames = defineQueryNames({ count: 'event-count' });
function parseCountry(value: unknown): { country: string } {
  if (
    !value ||
    typeof value !== 'object' ||
    !('country' in value) ||
    typeof value.country !== 'string'
  )
    throw new Error('Expected a country.');
  return { country: value.country };
}
const operations = {
  eventCount: defineOperation({
    queryNames,
    input: parseCountry,
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
`{ limit }` can lower the row bound. `values` maps each `$name` parameter in that
statement to its value, keyed without `$`. An operation may execute several named
queries.

Values are JSON scalars: strings, numbers, booleans, or null, at most 8 KiB in
total. Pass dates as ISO strings and cast them in SQL, such as
`$start::TIMESTAMPTZ`. Arrays and objects are rejected; pass a list as a JSON
string, such as `list_contains(from_json($countries, '["VARCHAR"]'), country)`.
The operation's `input` parser validates values; the backend binds them as
statement parameters, never as SQL text. For an optional filter, write the
condition explicitly, such as `$country = '' OR country = $country`.

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
common inputs and results.

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

# Contracts

Import operation definitions, parsers, and shared types from
`@altertable/data-app/contract`. This entry is safe to import in browser and server
modules. Keep SQL and operation implementations on the server; browser modules
should import their operation types using `import type`.

## Execute named queries

The app supplies `calendar`, `parseActivity`, `checkInput`, `buildActivitySql`,
and `parseActivityRows` in this example.

```ts
import {
  defineOperation,
  defineQueryNames,
} from '@altertable/data-app/contract';

const queries = defineQueryNames({ activity: 'feature-activity' });
const activity = defineOperation({
  queryNames: queries,
  input: calendar.parseRequest,
  output: parseActivity,
  checks: [checkInput],
  policy: { maxQueryRows: 100, maxDurationMs: 15000, exposeSql: true },
  async run({ query }, input) {
    const result = await query(queries.activity, buildActivitySql(input));
    return parseActivityRows(result);
  },
});
```

`query` inherits the operation's limit and cancellation signal; `{ limit }` can lower a particular query's bound. Names are checked by TypeScript and at runtime. The server records the SQL and query ID when execution occurs, so evidence does not need a separate result field. Browser modules import operation types with `import type`; they never import server implementations.

## Shared date ranges

Use `defineDateRangeContract` in a browser-safe module to share source coverage,
time zone, maximum range, and comparison rules between the server parser and
React variables. The server uses `calendar.parseRequest`; React uses the same
contract with `dateRangeVariable`.

```ts
import { defineDateRangeContract } from '@altertable/data-app/contract';

export const calendar = defineDateRangeContract({
  minDate: '2026-01-01',
  maxRangeDays: 90,
  timeZone: 'UTC',
});
```

`parseEmptyInput`, `parseTrue`, `parseCount`, and `parseDateRangeInput` validate
common inputs and results. `connectionCheck()` defines a bounded connectivity
operation. A successful connectivity check confirms access; it is not an
analysis result.

See [server authorization](server.md) and [React views](react.md) for the two
sides of an operation.

## Message routes

Message contracts describe the payloads allowed between an embedded app and its
host. Share these contracts with the app; keep handlers and authorization in the
host/server.

```ts
import {
  createMessageRouter,
  defineMessageRoute,
  navigationUpdateRoute,
} from '@altertable/data-app/contract';
import { createNavigationHandler } from '@altertable/data-app/embed';

const routes = {
  echo: defineMessageRoute({ input: parseString, output: parseString }),
  'navigation.update': navigationUpdateRoute,
};
const router = createMessageRouter(routes, {
  echo: value => value,
  'navigation.update': createNavigationHandler(),
});
```

The app defines `parseString` to validate unknown values. `router.dispatch` checks
registered routes, input, output, and cancellation. `MessageRoutingError` exposes
an intentional public code, message, and optional request ID; other handler
errors are replaced with a generic failure.

`defineDataQueryRoute(operationContracts)` validates the selected operation's
input and output and preserves its response evidence. It infers the result type
from the selected operation when used with `createMessageClient`. Share input and
output parsers, not operation implementations containing SQL or credentials.
`dataAppRoutes` supplies generic `data.query` and `navigation.update` contracts;
generic hosts must delegate operation validation and authorization to their
server. Request handlers receive `{ signal }` for cancellation.

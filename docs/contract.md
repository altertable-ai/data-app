# Contracts

Import operation definitions, parsers, and shared types from
`@altertable/data-app/contract`. This entry is safe to import in browser and server
modules. For HTTP apps, keep SQL and operation implementations on the server; browser modules
should import their operation types using `import type`.

## Execute named queries

Declare SQL once with `defineDataApp()` to preserve exact query and parameter
names. Define operations with `dataApp.defineOperation()` and pass `dataApp.config`
to rendering and mounting APIs. Use `{ defaultValue }` for a fallback or `{}` for a required value.

```ts
import { defineDataApp } from '@altertable/data-app/config';
import { rowsAsRecords } from '@altertable/data-app/contract';

const dataApp = defineDataApp({
  title: 'Products',
  scope: { organization: 'demo', environment: 'production' },
  appearance: { theme: 'system' },
  queries: {
    products: {
      statement: 'SELECT * FROM products WHERE org_id = $orgId LIMIT $limit',
      params: { orgId: {}, limit: { defaultValue: 10 } },
    },
  },
});

const products = dataApp.defineOperation({
  input: parseProductInput,
  output: parseProducts,
  checks: [{}],
  policy: { maxQueryRows: 100, maxDurationMs: 15000 },
  async run({ query }, input) {
    const result = await query('products', input);
    return rowsAsRecords(result, ['org_id']);
  },
});
```

The app supplies `parseProductInput()` and `parseProducts()`. Validate filter values
in the input parser. `{}` declares a required parameter; `{ defaultValue }` supplies
a fallback. `query(name, params, { limit })` executes only registered queries and
inherits the operation's row limit and cancellation signal.

SQL and resolved parameter values pass unchanged to the backend. Results include
query evidence; use `products.queryNames` with `createDataContext()` to bind it.
For HTTP apps, authorization can supply protected `queryParams`, such as `orgId`.
The host/backend enforces data access and limits.

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
common inputs and results. `connectionCheck(dataApp.config.queries)` runs the registered `connection` query. A successful connectivity check confirms access; it is not an
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

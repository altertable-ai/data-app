# Contracts

Import operation definitions, parsers, and shared types from
`@altertable/data-app/contract`. This entry is safe to import in browser and server
modules. The app declaration is browser-safe and includes its SQL registry. For HTTP apps,
keep operation implementations, credentials, and authorization on the server; browser modules
import operation types using `import type`.

## Execute named queries

Declare queries with `defineDataApp()` and operations with `dataApp.defineOperation()`.
Use descriptive `lowerCamelCase` query names. Declare parameter types in `params`
(use `{}` for none) and returned aliases in `projections`.

```ts
import { defineDataApp } from '@altertable/data-app';

const dataApp = defineDataApp({
  title: 'Products',
  description: 'Explore products for the selected organization.',
  scope: { organization: 'demo', environment: 'production' },
  appearance: { theme: 'system' },
  queries: {
    products: {
      statement:
        'SELECT name, unit_price AS "unitPrice" FROM products WHERE org_id = $orgId LIMIT $limit',
      params: {
        orgId: { type: 'string' },
        limit: { type: 'number', defaultValue: 10 },
      },
      projections: {
        name: { type: 'string' },
        unitPrice: { type: 'number', nullable: true },
      },
    },
  },
});

const products = dataApp.defineOperation({
  input: parseProductInput,
  checks: [{}],
  policy: { maxQueryRows: 100, maxDurationMs: 15000 },
  async run({ query }, input) {
    const result = await query('products', input);
    return result.rows;
  },
});
```

`parseProductInput()` is app-owned. Validate inputs there and business rules in
`run()`. Derive operation data from `query()` rows; clients and views infer the
returned type. Handle empty results. HTTP results must be JSON-serializable.
Include representative valid inputs in `checks`.

Host `queryParams` supplies protected parameters; callers cannot override them.
Other values come from `query()` arguments or `defaultValue`. Missing values are
checked before execution. `query(name, params, { limit })` inherits the operation's
row limit and cancellation signal.

### Declare query projections

Inspect each query and declare every returned alias with `{ type, nullable? }`.
Result keys keep the exact SQL names; alias columns in SQL to change casing, as
with `"unitPrice"` above.
Determine nullability from the schema and SQL, even when sampled rows contain no
nulls. Update projections when changing SQL.

`query()` converts cells to declared types. For exact numeric precision, return
SQL text and declare `string`.

Results include query evidence; use `products.queryNames` with `createDataContext()`
to bind it. The host/backend enforces data access and limits; see
[server authorization](server.md).

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

`parseEmptyInput()`, `parseCount()`, and `parseDateRangeInput()` validate common inputs
and query values. `connectionCheck(dataApp.queries)` runs the registered `connection` query. A successful connectivity check confirms access; it is not an
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
import { createNavigationHandler } from '@altertable/data-app-embed';

const routes = {
  'demo:echo': defineMessageRoute({ input: parseString, output: parseString }),
  'navigation:update': navigationUpdateRoute,
};
const router = createMessageRouter(routes, {
  'demo:echo': value => value,
  'navigation:update': createNavigationHandler(),
});
```

The app supplies `parseString()` to validate unknown values.
`router.dispatch()` validates route input and output. Use `MessageRoutingError`
for intentional public failures; other handler errors are hidden.

Use `defineDataQueryRoute(operationContracts)` for typed named operations or
`dataAppRoutes` for generic operation and navigation routes. Handlers must
validate operations and authorize data access; see [embedding](embed.md).

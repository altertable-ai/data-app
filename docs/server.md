# Server

Import `createDataHandler` and the `RequestAccess` type from
`@altertable/data-app/server`. The handler accepts a Web `Request` and returns a
`Promise<Response>`. This entry can be imported in Node and Bun without loading
React or the Bun local-development adapter.

```ts
import { createDataHandler } from '@altertable/data-app/server';
import { operations } from './operations';

export const handleDataRequest = createDataHandler(
  operations,
  async (request, operation) => {
    const viewer = await authenticate(request);
    return {
      lakehouse: await lakehouseFor(viewer, operation),
      canDiscloseSql: false,
    };
  }
);
```

The app supplies `authenticate` and `lakehouseFor`, then routes `/api/data/*`
requests to the handler. Authorize every viewer and operation, and scope the
returned lakehouse to the viewer's permitted data. Origin and Fetch Metadata
checks reject cross-site browser requests; they do not authenticate viewers.

The handler validates operation input and output, enforces query row and duration
bounds, propagates cancellation, and returns request IDs with errors. SQL is
disclosed only when both the operation policy and `canDiscloseSql` allow it.
Keep credentials and operation implementations on the server. The browser sends
`data:query` and does not receive lakehouse credentials.

See [operation contracts](contract.md), the [client](client.md), and the
[local Bun adapter](server-bun.md).

## Request input limits

JSON request bodies are limited to **16,384 encoded bytes**, including multibyte
UTF-8 content. The handler counts bytes as it reads and cancels remaining
consumption on overflow; it does not rely on `Content-Length`. Authorization
runs before reading. Request cancellation interrupts waiting reads. Invalid or
interrupted bodies return `400/invalid_input`; oversized bodies return
`413/input_too_large`.

`maxDurationMs` bounds execution after input parsing. It does not add a separate
body-read deadline. The hosting runtime controls the size of individual chunks.

## Hosting named operations

A hosted embed uses the same app source as local Bun. The iframe client sends
`data:query` with `{ operation, input }`. The host runs the app's operation
registry and turns each statement into a SQL call. Credentials stay in the host's
executor.

```ts
import {
  createMessageRouter,
  dataAppRoutes,
  DataSourceError,
} from '@altertable/data-app/contract';
import { createNavigationHandler } from '@altertable/data-app/embed';
import { createHostedQueryHandler } from '@altertable/data-app/server';
import { operations } from './operations';

const handleQuery = createHostedQueryHandler(operations, {
  canDiscloseSql: false,
  async execute({ sql, limit }, signal) {
    const result = await viewerLakehouse.query({ sql, limit, signal });
    if (result.denied) throw new DataSourceError('forbidden');

    return result.table;
  },
});

const router = createMessageRouter(dataAppRoutes, {
  'data:query': (payload, context) => handleQuery(payload, context.signal),
  'navigation:update': createNavigationHandler(),
});
```

Pass `router.dispatch` to `attachDataAppBridge({ onMessage })`. Build one handler
per viewer session so `execute` closes over that session's credentials.

`execute` receives `{ sql, limit }` and the operation's abort signal. `limit` is
already capped by the operation policy. Return this shape:

| Field     | Required | Meaning                                                                         |
| --------- | -------- | ------------------------------------------------------------------------------- |
| `columns` | yes      | Column names, or `{ name, type? }`                                              |
| `rows`    | yes      | Positional arrays, one value per column, at most `limit` rows                   |
| `queryId` | no       | String stored on the operation envelope                                         |
| `errors`  | no       | A string, non-empty array, or non-empty object rejects the statement            |
| `reason`  | no       | `unauthorized`, `forbidden`, `rate_limited`, `query_rejected`, or `unavailable` |

Throw `DataSourceError` for the same reasons when the SQL API fails before it
returns a table. The handler maps those reasons to `source_*` codes (`429` for
`rate_limited`, `502` otherwise). Rows beyond `limit` fail the operation. SQL is
included in the response only when both the operation's `exposeSql` and
`canDiscloseSql` allow it.

The Altertable product host lives outside this package. It must dispatch bridge
route `data:query` to `createHostedQueryHandler` and answer with
`{ status, body }`, the same envelope as `createDataHandler`. The app will not
send a raw SQL route. Until that dispatch is wired, a hosted iframe cannot load
operation data.

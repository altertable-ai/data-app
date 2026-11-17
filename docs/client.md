# Client

Use this guide when customizing client delivery. Standard apps keep the
starter's client.

## Registered operations

Hosted and local metric/finding starters use the same operation client:

```ts
const operations = dataApp.defineOperations({ sampleCountsByGroup });
const client = operations.createDataClient();
```

`run()` executes in the browser. Hosted apps send each named query through
`data:query`; local apps install `installLocalQueryLakehouse()` before mounting
and send it to `POST /api/query/:queryId`. Both backends execute only registered
SQL. The local Bun server receives `dataApp.queries` through `serveLocalApp()`.
Keep `run()` and its imports browser-safe in this mode.

## HTTP operations

```ts
import { createDataClient } from '@altertable/data-app/client';
import { operationFilters } from './filters.ts';
import type { operations } from './operations.ts';

const client = createDataClient<typeof operations>({
  filters: operationFilters,
});
const response = await client.query(
  'sampleCountsByGroup',
  { groupName: 'all' },
  { signal }
);
```

Use this delivery when operations must stay on the server. Keep the operations
import type-only and share browser-safe filter declarations between both sides
([shared filters](filters.md#share-filters-with-http-operation-apps)).
Inputs and data are inferred from the operation map and `run()`.

The default endpoint is `/api/data`. Override it with
`createDataClient<typeof operations>({ filters, endpoint, fetch })` to change the base URL or supply a Fetch
implementation. Calls POST JSON to `/api/data/:operation`; the client sends
operation inputs rather than SQL or credentials.

For direct client calls, render `response.data` and label it with `response.input`
so retained results keep their original scope during refresh. React views handle
this automatically. For custom error handling, import `DataAppError` from the same
entry for public codes and request IDs. Pass an abort signal to cancel a request.

See [contracts](contract.md), [server handlers](server.md), and
[React bindings](react.md).

## Iframe transport

`createDataClient<typeof operations>({ filters, transport })` accepts a
`DataTransport` for custom HTTP operation delivery. Without it, the client uses
`/api/data/:operation`. `createHttpTransport()` provides the underlying adapter.

A URL-hosted app configures trust and installs the bridge before mounting:

```ts
import {
  createIframeTransport,
  installDataAppTransport,
} from '@altertable/data-app/client';

const bridge = createIframeTransport({
  parentOrigin: 'https://host.example.com',
});
const uninstall = installDataAppTransport(bridge);
```

Use a configured trusted origin, not an unverified URL parameter. Installation makes data clients discover the connection. React mounting and
URL controls attach the optional navigation adapter to that connection. Cleanup removes
the installation and disposes pending work. Bundle apps receive this installation
from the [trusted bootstrap](embed.md#trusted-bootstrap).

`getDataAppTransport()` returns the explicitly installed bridge. Its `request()`
method supports custom typed routes:

```ts
import {
  createMessageClient,
  getDataAppTransport,
} from '@altertable/data-app/client';

const bridge = getDataAppTransport();
if (!bridge) throw new Error('An iframe transport must be installed first.');
const messages = createMessageClient(routes, bridge.request);
const result = await messages.request('demo:echo', 'hello', { signal });
```

The app supplies shared `routes` and optional `signal`. For a framework-neutral
UI that supports [content sizing](embed.md#content-sizing), call
`bridge.supportContentSizing()` and use its returned cleanup function.

## App navigation

Navigation is an optional app adapter, separate from bootstrap and data delivery:

```ts
import { createDataAppNavigation } from '@altertable/data-app/client';

const navigation = createDataAppNavigation({ bridge });
const currentLocation = navigation.snapshot();
navigation.update({ search: '?period=last-7', hash: '#daily' }, 'push');
// If app code changes its URL directly:
navigation.publish('replace');
// Before removing the app or its transport:
navigation.dispose();
```

The adapter owns search/hash synchronization with host Back/Forward navigation.
Opaque frames keep location in memory. `getDataAppNavigation()` discovers and
shares the installed adapter; React mounting and URL-backed controls attach it
automatically. Dispose a manually created adapter before removing its transport.

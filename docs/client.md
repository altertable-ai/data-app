# Client

Use this guide when customizing client delivery. Standard apps keep the
starter's client. Import `createDataClient()` from `@altertable/data-app/client`.

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

Keep the operations import type-only so implementations stay on the server.
Pass the filters each operation reads from a browser-safe module both sides
import ([shared filters](filters.md#share-filters-with-http-and-local-apps)).
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

## Hosted operations

Bind operations to the app's query registry. The hosted client derives its
filters and uses the installed iframe bridge:

```ts
// ... app declared with defineDataApp(), operations created with dataApp.defineOperation()
const operations = dataApp.defineOperations({ sampleCountsByGroup });
const client = operations.createDataClient();
const response = await client.query('sampleCountsByGroup', { groupName: '' });
```

In hosted apps, `client.query()` executes the operation's `run()` in the iframe.
Each `run()` call to its named `query()` helper sends the registered query ID,
resolved parameter values, and row limit through `data:query`. The backend uses
the query ID from `defineDataApp({ queries })` to execute the saved SQL. The
trusted bootstrap installs the bridge before app execution.

In local directory apps, `client.query()` posts the operation name and input to
`/api/data/:operation`. Bun executes `run()` there. Keep the browser's operation
import type-only and pass the browser-safe filter declarations to the HTTP
client as shown above. This keeps operation implementations and their server-only
imports out of the browser bundle. The `run()` declarations and `client.query()` calls use
the same names and inputs in both environments.

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

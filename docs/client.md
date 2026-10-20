# Client

Import `createDataClient()` from
`@altertable/data-app/client`. The client uses Fetch APIs and has no React or
server dependency.

## HTTP operations

```ts
import { createDataClient } from '@altertable/data-app/client';
import type { operations } from './operations';

const client = createDataClient<typeof operations>();
const response = await client.query('activity', input, { signal });
```

The app defines `operations`, `input`, and an optional cancellation `signal`.
Inputs and data are inferred from the operation map and `run()`. Keep the import
type-only so operation implementations stay on the server.

The default endpoint is `/api/data`. Override it with
`createDataClient<typeof operations>({ endpoint, fetch })` to change the base URL or supply a Fetch
implementation. Calls POST JSON to `/api/data/:operation`; the client sends
operation inputs rather than SQL or credentials.

For direct client calls, render `response.data` and label it with `response.input`
so retained results keep their original scope during refresh. React views handle
this automatically. Use `DataAppError` for public error codes and request IDs in
custom error handling; pass an abort signal to cancel a request.

See [contracts](contract.md), [server handlers](server.md), and
[React bindings](react.md).

## Browser-owned operations for bundle apps

Start with the complete [single-file example](app-authoring.md#use-release-matched-starters)
and [data app authoring guide](hosted-apps.md).
Bundle apps pass their operation registry as a value:

```ts
import { connectionCheck } from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';

// dataApp declares a connection query.
const client = createDataClient({
  operations: { connection: connectionCheck(dataApp.queries) },
});
const response = await client.query('connection', {});
```

Operations run in the browser and query through the host's `data:sql` route.
The trusted bootstrap installs the bridge before app execution. A custom runtime
must install it first or supply an authorized `lakehouse` adapter.

Do not combine `operations` with `transport`, `endpoint`, or `fetch`. Browser
policy bounds app requests; the [host SQL handler](embed.md#sql-query-route)
must independently enforce access and resource limits.

## Iframe transport

`createDataClient<typeof operations>({ transport })` accepts a `DataTransport`. Without an explicit
transport, endpoint, or Fetch implementation, it discovers an installed iframe
transport before falling back to HTTP. Explicit endpoint/Fetch options select
HTTP. `createHttpTransport()` provides the underlying operation delivery adapter.

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

# Client

Import `createDataClient()` and `DataAppError` from
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
Operation input and output types are inferred from the server registry. Keep the
registry import type-only so its SQL and implementation stay on the server.

The default endpoint is `/api/data`. Override it with
`createDataClient({ endpoint, fetch })` to change the base URL or supply a Fetch
implementation. Calls POST JSON to `/api/data/:operation`; the client sends
operation inputs rather than SQL or credentials.

`DataResponse` contains `data`, the exact request `input`, `requestId`,
`queriedAt`, `queryIds`, and executed `queries`. Use the returned input when labeling stale data during a refresh.
HTTP and iframe delivery validate the same success envelope: data, request ID,
query timestamp, query IDs, and optional query evidence. Malformed responses
reject with `invalid_response`.

`DataAppError` exposes a `code` and optional `requestId`; cancellation follows
the supplied abort signal.

See [contracts](contract.md), [server handlers](server.md), and
[React bindings](react.md).

## Browser-owned operations for bundle apps

Start with the complete [single-file example](../examples/starter-data-app/index.tsx)
and [data app authoring guide](hosted-apps.md).
Bundle apps pass their operation registry as a value:

```ts
import { connectionCheck } from '@altertable/data-app/contract';
import { createDataClient } from '@altertable/data-app/client';

// DATA_APP_CONFIG declares a connection query.
const client = createDataClient({
  operations: { connection: connectionCheck(DATA_APP_CONFIG.queries) },
});
const response = await client.query('connection', {});
```

The client runs input parsing, operation logic, and output parsing in the browser.
Operation policy bounds rows, duration, and response size and records query evidence. Each query sends `{ statement, limit, params? }`
to the installed iframe bridge's `data:sql` route; the host needs no operation
registry. Results include query evidence. Credentials remain backend-owned.

The trusted bootstrap installs the bridge for bundle apps. A custom runtime must
install it before querying. An explicit `lakehouse` can supply another authorized
adapter, including `bridge.lakehouse` or a local server adapter. `operations` cannot
be combined with `transport`, `endpoint`, or `fetch`; a `lakehouse` requires
`operations`. The exported `DataClientOptions` union rejects mixed configurations
at compile time. Omitting `operations` preserves named HTTP/iframe operation delivery.

The host must implement and authorize the [SQL route](embed.md#sql-query-route).
Browser policies improve app behavior; backend access and resource limits must be
enforced independently because a frame can forge requests. Cancellation reaches
the host through the existing bridge cancellation protocol.

## Iframe transport

`createDataClient({ transport })` accepts a `DataTransport`. Without an explicit
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

The app supplies shared `routes` and optional `signal`. Both client and host
validate messages. The bridge retains opaque host state through `snapshot()` and
`subscribe(listener)`; only authenticated, current-session state reaches subscribers.
It never changes browser history or interprets the host state.

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

The adapter provides `snapshot()`, `subscribe()`, and `update()`. Opaque sandboxes keep
search/hash in memory; URL frames preserve their URL and local-preview parent
marker. Host Back/Forward state is applied without publishing it back.

`getDataAppNavigation()` discovers an installed or verified local-preview bridge
and shares one adapter per document. React mounting and URL-backed controls call
it automatically. Apps that only use data delivery do not attach navigation.

## Pending request limits

Each iframe bridge accepts at most 128 unresolved requests, including requests
waiting for the connection handshake. Further calls reject with `bridge_busy`
until a pending call completes, is cancelled, or times out. This bounds the
client's promises, timers, and queued messages.

Hosts enforce their own request limits independently of the client.

A failed local-preview verification can be retried by the next explicit data
request. Concurrent callers share the current verification attempt; aborting
one caller does not cancel the others. Retrying does not automatically repeat
a data operation or bypass the configured parent-origin check, and verification
failure never falls back to untrusted iframe or HTTP delivery.

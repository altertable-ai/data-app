# Client

Import `createDataClient` and `DataAppError` from
`@altertable/data-app/client`. The client uses Fetch APIs and has no React or
server dependency.

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
`queriedAt`, and `queryIds`. `queries` is present only when the server permits
SQL disclosure. Use the returned input when labeling stale data during a refresh.
`DataAppError` exposes a `code` and optional `requestId`; cancellation follows
the supplied abort signal.

See [contracts](contract.md), [server handlers](server.md), and
[React bindings](react.md).

## Iframe transport

`createDataClient({ transport })` accepts a `DataTransport`. Without an explicit
transport, endpoint, or Fetch implementation, it discovers an installed iframe
transport before falling back to HTTP. Explicit endpoint/Fetch options select
HTTP. `createHttpTransport` provides the underlying operation delivery adapter.

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

Use a configured trusted origin, not an unverified URL parameter. Installation
makes data clients and React URL controls use the same connection. Cleanup removes
the installation and disposes pending work. Bundle apps receive this installation
from the [trusted bootstrap](embed.md#trusted-bootstrap).

`getDataAppTransport()` returns the explicitly installed bridge. Its `request`
transport supports custom typed routes:

```ts
import {
  createMessageClient,
  getDataAppTransport,
} from '@altertable/data-app/client';

const bridge = getDataAppTransport();
if (!bridge) throw new Error('An iframe transport must be installed first.');
const messages = createMessageClient(routes, bridge.request);
const result = await messages.request('echo', 'hello', { signal });
```

The app supplies shared `routes` and optional `signal`. Both client and host
validate messages. `bridge.appLocation` provides `snapshot`, `subscribe`, and
`update` for search/hash state, including virtual state in opaque sandboxes.
`bridge.location(mode)` publishes URL changes made outside those controls.
Transport state is shared per window across separately bundled entry points;
install only one transport per document. Public error classes retain `instanceof`
recognition across independent bootstrap and app bundles in that window.

## Pending request limits

Each iframe bridge accepts at most 128 unresolved requests, including requests
waiting for the connection handshake. Further calls reject with `bridge_busy`
until a pending call completes, is cancelled, or times out. This bounds the
client's promises, timers, and queued messages.

The host independently limits pending requests to 128: an iframe can send
messages directly without using the client helper. The shared cap is a resource
policy, not a requirement of the message protocol. It rejects excess requests;
it does not queue them or limit the total number of calls over a session.

# Embed a data app

Import framework-neutral host APIs from `@altertable/data-app/embed`. For React
hosts, see [React embedding](react-embed.md). Neither embedding entry requires the
app UI stylesheet.

## Sources

`attachDataAppBridge()` in source mode owns iframe loading, sandbox policy, startup timeout, and
message delivery. The host supplies an iframe and a validated message dispatcher:

```ts
import { attachDataAppBridge } from '@altertable/data-app/embed';

const host = attachDataAppBridge({
  iframe,
  source: { type: 'url', url: 'https://apps.example.com/report' },
  onMessage: router.dispatch,
});
```

The host defines `iframe` and `router`; see [message contracts](contract.md#message-routes).
Call `host.dispose()` before replacing the source or retrying. A URL source requires HTTP(S)
and a different origin from its host. The source bridge adds `__altertable_parent` to the
app URL. A hosted app must explicitly install a transport to its configured,
trusted parent origin using the [client API](client.md#iframe-transport).
The query parameter alone does not establish trust.

A bundle source has this shape:

```ts
const source = {
  type: 'bundle' as const,
  bootstrapUrl: 'https://my-report-app-1.apps.example.net/',
  javascript: bundle.javascript,
};
```

The host provides a self-contained JavaScript bundle. React bridges replace the
iframe whenever its JavaScript content changes. Serve the bootstrap page with a CSP compatible with the bundle.
Bundle mode uses `sandbox="allow-scripts"` and an opaque origin; it cannot read
the host document or use same-origin privileges. Both modes use
`referrerPolicy="no-referrer"`.

## Trusted bootstrap

For Cloudflare hosting, upload the [Worker asset](worker.md). It includes the
bootstrap HTML and security policy; deployments supply the runtime domain and
trusted parent origins through bindings.

For other hosts that own their HTML and security policy, bundle this initializer
into the bootstrap document before any app code:

```ts
import { startDataAppBootstrap } from '@altertable/data-app/embed';

const dispose = startDataAppBootstrap({
  parentOrigin: 'https://host.example.com',
});
```

The bootstrap URL is trusted executable code: it receives the app script and
session token. Its hosting service must enforce its CSP. The bridge cannot impose
CSP on a remote response. A starting policy for self-contained scripts and styles
is `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'`.
The initializer installs a shared transport before evaluating the app script;
data clients discover it even when independently bundled. The bootstrap contains
no app navigation adapter. React mounting or URL controls attach navigation in the
app bundle; non-React apps use `createDataAppNavigation()` from `/client`.

## Delivery and navigation

`attachDataAppBridge()` also supports connection mode for a host-owned iframe. Supply
`connection: { type: 'origin', origin }` or `{ type: 'opaque', token }`, and an
`onMessage` dispatcher. Both modes use the same transport. It returns `dispose()`, `setPresentation()`, and `setLogger()` methods and owns source/origin checks, request
correlation, cancellation, bounded pending requests, and reconnection. Use source mode for bundle loading and token rotation. The opaque destination requires
wildcard delivery, but incoming messages still require the exact iframe window,
null origin, token, document, and session to match.

`createNavigationHandler({ window, reservedSearchParams })` handles the shared
`navigation:update` route using browser history. Reserved host query parameters
survive app changes. Supply your own handler when integrating a framework router.
Host Back/Forward events publish opaque host state through the bridge. The app's
optional navigation adapter interprets search/hash and synchronizes controls;
opaque apps keep that state in memory rather than modifying their document URL.

## Status and diagnostics

`onStatusChange` receives `connecting`, `connected`, `ready`, `failed`, or
`disconnected`. `connected` means transport initialization; `ready` means a URL
client acknowledged initialization or a bundle script finished evaluation. It
does not mean asynchronous data queries finished. Script errors report `failed`.
The source bridge's `startupTimeoutMs` defaults to 30 seconds.

`onDiagnostic` receives only message `direction` and `type`, never tokens or
payloads. Routed handlers must authorize every data request. Message validation
and iframe isolation do not grant access to data or execute SQL.

## Registered query route

For registered bundle apps, attach `registeredQueryRoute` to `data:query`:

```ts
import {
  createMessageRouter,
  registeredQueryRoute,
} from '@altertable/data-app/contract';

const router = createMessageRouter(
  { 'data:query': registeredQueryRoute },
  {
    'data:query': async (query, { signal }) => {
      return executeRegisteredQueryForCurrentViewer(appRevision, query, signal);
    },
  }
);
```

The host supplies `appRevision` and `executeRegisteredQueryForCurrentViewer()`.
Resolve the revision from the trusted iframe session. Look up the registered
statement, validate its variable values, safely construct SQL, and enforce viewer
permissions and resource limits on the backend. Never accept registration from
the iframe or use an iframe-supplied app identity for authorization.

`RegisteredQueryInput` is `{ operation, variables, limit }`; the output is the
same `QueryResult` as SQL delivery. `operation` identifies an individual named
statement. The request envelope, ID correlation, cancellation, response validation,
and pending-call limits are unchanged. `defineDataQueryRoute()` remains the
separate contract for HTTP-style operation hosts returning data envelopes; choose
the contract that matches the app execution mode.

`createRegisteredQueryHandler(registration, authorize)` is available for trusted
server/local hosts with a stored registration and a statement-based Lakehouse.
It derives required variables, rejects extra values, applies defaults, and builds
SQL. Authorization runs on every request; the supplied backend must enforce access
and resource limits. In production iframe hosts, forward the request to the
backend so registration lookup and enforcement happen there.

**Do not register `data:sql` for registered hosted apps.** Keeping a raw statement
route would bypass the registered-query restriction. Deploy host registration
support before updating apps; unsupported registered requests fail without an
SQL fallback.

## SQL query route

Legacy hosts explicitly permitting arbitrary SQL register `sqlQueryRoute` explicitly:

```ts
import {
  createMessageRouter,
  sqlQueryRoute,
} from '@altertable/data-app/contract';
import { createSqlQueryHandler } from '@altertable/data-app/embed';

const router = createMessageRouter(
  { 'data:sql': sqlQueryRoute },
  {
    'data:sql': createSqlQueryHandler(async (query, { signal }) => {
      return authorizedLakehouseForCurrentViewer(query, signal);
    }),
  }
);
// Supply router.dispatch as the shell's onMessage handler.
```

The host supplies `authorizedLakehouseForCurrentViewer()`. Its backend must enforce
viewer/dataset permissions, permitted query behavior, maximum rows, execution
time, concurrency, and response size independently of browser policy. Route
validation is not SQL authorization. `createSqlQueryHandler()` calls authorization
for each query, forwards cancellation, and preserves `DataSourceError` reasons
as public `source_*` errors with request IDs. Authorization failures return
`forbidden`; unknown query errors are hidden. Custom handlers can return deliberate
public failures with `MessageRoutingError`.

`SqlQueryInput` (exported from `/contract`) carries
`{ statement: string, limit: number }`; responses are
`{ columns: { name: string, type?: string }[], rows: unknown[][], queryId?: string }`.
The route rejects empty statements, unsafe or nonpositive limits, malformed
results, and results exceeding the requested limit. The bridge's existing payload
and pending-call limits apply, and cancellation reaches the handler's signal.
Operation names and inputs stay in the app; query evidence is assembled there.

`dataAppRoutes` retains named `data:query` and navigation routes for existing
server-backed hosts. SQL hosts opt into `data:sql`; they need no named-operation
handler unless they also serve HTTP-style apps. Update the host before switching
an app to browser-owned operations. Older hosts reject `data:sql` as unknown.

## Parent presentation

The parent declares where the iframe is mounted and owns its resolved theme:

```ts
const host = attachDataAppBridge({
  iframe,
  source: { type: 'url', url: 'https://apps.example.com/report' },
  presentation: { surface: 'embedded', theme: 'dark' },
  onMessage: router.dispatch,
});

// Update presentation without replacing the iframe or its bridge session.
host.setPresentation({ surface: 'embedded', theme: 'light' });
```

Both source and connection modes support the `presentation` option and
`host.setPresentation(presentation)` method. `DataAppPresentation` is exported from
`/embed`. Use `surface: 'embedded'` when the parent provides page chrome, as in the
Altertable frontend, and `'standalone'` when the app provides its own header and
footer. `theme` must be resolved to `'light'` or
`'dark'`; the parent decides how its system preference is resolved.

Presentation travels over `postMessage()` in the authenticated `bridge:initialize` and
`state:update` messages, alongside `search` and `hash`. Framework-neutral apps
can narrow the unknown state returned by `bridge.snapshot()` to read its
`presentation` field, and subscribe through `bridge.subscribe()`. React `<DataApp>` consumes it automatically.
An embedded surface renders toolbar actions without the page header or footer.
Both surfaces follow the parent's theme, including presentation mode, without
changing saved viewer preferences. Omitting presentation preserves standalone behavior;
`host.setPresentation(undefined)` restores it.

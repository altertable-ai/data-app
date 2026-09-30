# Embed a data app

Import framework-neutral host APIs from `@altertable/data-app/embed`. For React
hosts, see [React embedding](react-embed.md). Neither embedding entry requires the
app UI stylesheet.

## Sources

`attachDataAppShell` owns iframe loading, sandbox policy, startup timeout, and
message delivery. The host supplies an iframe and a validated message dispatcher:

```ts
import { attachDataAppShell } from '@altertable/data-app/embed';

const dispose = attachDataAppShell({
  iframe,
  source: { type: 'url', url: 'https://apps.example.com/report' },
  onMessage: router.dispatch,
});
```

The host defines `iframe` and `router`; see [message contracts](contract.md#message-routes).
Dispose before replacing the source or retrying. A URL source requires HTTP(S)
and a different origin from its host. The shell adds `__altertable_parent` to the
app URL. A hosted app must explicitly install a transport to its configured,
trusted parent origin using the [client API](client.md#iframe-transport).
The query parameter alone does not establish trust.

A bundle source has this shape:

```ts
const source = {
  type: 'bundle' as const,
  bootstrapUrl: 'https://preview.example.com/bootstrap',
  javascript: bundle.javascript,
  revision: bundle.revision,
};
```

The host provides a self-contained JavaScript bundle and a revision identifying
that bundle. Serve the bootstrap page with a CSP compatible with the bundle.
Bundle mode uses `sandbox="allow-scripts"` and an opaque origin; it cannot read
the host document or use same-origin privileges. Both modes use
`referrerPolicy="no-referrer"`.

## Trusted bootstrap

For Cloudflare hosting, upload the [Worker asset](worker.md). It includes the
bootstrap HTML and security policy; deployments supply the runtime domain and
trusted parent origins through bindings.

For other hosts that own their HTML and security policy, embed the
[standalone bootstrap asset](bootstrap.md). If your host already bundles its
bootstrap document, use this initializer before any app code:

```ts
import { startDataAppBootstrap } from '@altertable/data-app/embed';

const dispose = startDataAppBootstrap({
  parentOrigin: 'https://host.example.com',
});
```

The bootstrap URL is trusted executable code: it receives the app script and
session token. Its hosting service must enforce its CSP. The shell cannot impose
CSP on a remote response. A starting policy for self-contained scripts and styles
is `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';
img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'`.
The initializer installs a shared transport before evaluating the app script;
data clients discover it even when independently bundled. The bootstrap contains
no app navigation adapter. React mounting or URL controls attach navigation in the
app bundle; non-React apps use `createDataAppNavigation` from `/client`.

## Delivery and navigation

`attachDataAppBridge` is the lower-level API for a host-owned iframe. Supply
`connection: { type: 'origin', origin }` or `{ type: 'opaque', token }`, and an
`onMessage` dispatcher. It returns cleanup and owns source/origin checks, request
correlation, cancellation, bounded pending requests, and reconnection. Use the
shell for bundle loading and token rotation. The opaque destination requires
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
The shell's `startupTimeoutMs` defaults to 30 seconds.

`onDiagnostic` receives only message `direction` and `type`, never tokens or
payloads. Routed handlers must authorize every data request. Message validation
and iframe isolation do not grant access to data or execute SQL.

Message types follow `{scope}:{action}`: `bridge:connect`, `bridge:ready`,
`bridge:initialize`, `bridge:request`, `bridge:result`, `bridge:error`,
`bridge:cancel`, `bridge:disconnect`, `runtime:ready`, `runtime:error`,
`script:load`, and `state:update`. Routed requests use the same convention,
including `data:query` and `navigation:update`. Hosts, apps, and bootstrap scripts
must use matching names; the former unscoped and dot-separated names are no
longer supported.

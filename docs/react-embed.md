# React embedding

Import `DataAppShell` and `DataAppBridge` from
`@altertable/data-app/react/embed`. This entry depends on React and the embedding
engine, and does not load the app's widgets, React Query, or CSS.

## Shell

```tsx
import { DataAppShell } from '@altertable/data-app/react/embed';

<DataAppShell
  title="Activity report"
  source={{ type: 'url', url: 'https://apps.example.com/activity' }}
  onMessage={router.dispatch}
  loading={<p>Loading report…</p>}
  renderError={retry => <button onClick={retry}>Retry report</button>}
/>;
```

The host supplies `router` using [message contracts](contract.md#message-routes).
For bundles, use `{ type: 'bundle', bootstrapUrl, javascript, revision }` as
`source`. See [embedding](embed.md) for trust, sandbox, CSP, and bootstrap setup.

The shell creates and owns the iframe. Source changes, bundle revision changes,
and retries replace the entire frame. Handler changes use the latest callbacks
without resetting the session. `startupTimeoutMs`, `onStatusChange`, and
`onDiagnostic` have the same meaning as in the framework-neutral API. The iframe
remains hidden until ready; loading and error UI have sensible defaults.

## Host-owned iframe

Use `DataAppBridge` when the host owns iframe rendering:

```tsx
import { useState, type ComponentRef } from 'react';
import { DataAppBridge } from '@altertable/data-app/react/embed';

function Host() {
  const [iframe, setIframe] = useState<ComponentRef<'iframe'> | null>(null);
  return (
    <>
      <iframe ref={setIframe} title="Report" src={appUrl} />
      <DataAppBridge
        iframe={iframe}
        connection={{ type: 'origin', origin: new URL(appUrl).origin }}
        onMessage={router.dispatch}
      />
    </>
  );
}
```

The app supplies `appUrl` and `router`. A callback ref lets the bridge observe late
mounting and replacement; listeners attach to the iframe's owner document. The
bridge handles delivery only. Use `DataAppShell` to manage source loading,
sandbox policy, bundle tokens, and startup errors.

## Parent-owned presentation

Pass `hostContext={{ surface: 'altertable', colorScheme: resolvedColorScheme }}`
to `DataAppShell` or `DataAppBridge`. Use `'custom'` for other host surfaces.
Prop updates publish trusted state without reloading the iframe or reconnecting
the session. Resolve system preference in the parent to `'light'` or `'dark'`.
Inside an Altertable mount, `DataApp` retains toolbar actions and hides its header
and footer. See [host context](embed.md#host-presentation-context).

# React embedding

Import `<DataAppBridge>` from `@altertable/data-app/react/embed`. This entry depends
on React and the embedding engine, and does not load the app's widgets, React
Query, or CSS.

The bridge owns iframe setup and `postMessage()` communication. The consuming
frontend or CLI owns its shell: fetching a bundle, subscriptions, layout, loading
and error UI, and retry controls. Both hosts use the same bridge and transport.

## Source-managed iframe

Use `source` for local URL apps or hosted bundles. The bridge creates the iframe,
configures its sandbox, loads its source, and reports connection status. It renders
only the iframe; it adds no loading, error, or retry UI and does not hide the frame.

```tsx
import { useReducer, useState } from 'react';
import { DataAppBridge } from '@altertable/data-app/react/embed';
import type { DataAppStatus } from '@altertable/data-app/embed';

function Shell() {
  const [status, setStatus] = useState<DataAppStatus>('connecting');
  const [attempt, retry] = useReducer(value => value + 1, 0);

  return (
    <div className="app-shell">
      {status !== 'ready' && status !== 'failed' && <p>Loading report…</p>}
      {status === 'failed' && <button onClick={retry}>Retry report</button>}
      <DataAppBridge
        key={attempt}
        title="Activity report"
        source={{ type: 'url', url: 'http://127.0.0.1:25837/' }}
        onMessage={router.dispatch}
        onStatusChange={setStatus}
        iframeProps={{ className: 'app-frame', hidden: status !== 'ready' }}
      />
    </div>
  );
}
```

The host supplies `router` using [message contracts](contract.md#message-routes).
The local URL must have a different origin from its shell. For hosted bundles,
replace `source` with:

```tsx
source={{ type: 'bundle', bootstrapUrl, javascript }}
```

The host supplies those bundle values. See [embedding](embed.md) for trust,
sandbox, CSP, and bootstrap setup.

Source URL or JavaScript content changes replace the entire iframe. Change the
bridge's React `key` to retry with a fresh frame. Handler changes use the latest
callbacks without resetting the session. `startupTimeoutMs`, `onStatusChange`, and
`onDiagnostic` have the same meaning as in the framework-neutral API.

`iframeProps` forwards presentation and accessibility attributes to the iframe,
including `className`, `style`, and `hidden`. The bridge controls `src`, `srcDoc`,
`sandbox`, `referrerPolicy`, `loading`, and the callback ref. Loading is always
`eager` so an iframe hidden until ready can start. Supply `title` directly.

## Host-owned iframe

Use the same `<DataAppBridge>` with `iframe` and `connection` when the host already
owns a loaded iframe and its security policy:

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
mounting and replacement; listeners attach to the iframe's owner document. This
mode renders nothing and handles delivery only. Use source mode for bundle
loading, sandbox policy, token rotation, and startup timeout. The two prop modes
are mutually exclusive.

## Loading an embedded app

Use `<DataAppSkeleton>` from `/react` while the host builds or starts an app.
Call `injectDataAppShellStyles()` from `/react` before rendering the placeholder.
The host owns when to show it and supplies any surrounding header or footer.
`/react/embed` itself remains independent of UI components and styles.

## Parent-owned presentation

Pass `presentation={{ surface: 'embedded', theme: resolvedTheme }}`
to `<DataAppBridge>` in either source or connection mode. Use `'standalone'` when the app should render its own page chrome.
Prop updates publish trusted state without reloading the iframe or reconnecting
the session. Resolve system preference in the parent to `'light'` or `'dark'`.
Inside an embedded surface, `<DataApp>` retains toolbar actions and hides its header
and footer. See [parent presentation](embed.md#parent-presentation).

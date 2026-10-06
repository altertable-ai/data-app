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

## Annotation bar and batch submission

`AnnotationBar` from `/react` is an outer-frame control for a host-owned collection.
Install `injectDataAppAnnotationStyles()` before rendering it. This stylesheet
contains only annotation controls and leaves the host page layout intact. Pass the current drafts,
selection/delete callbacks, mode/visibility controls, and an asynchronous `onSend`.

```tsx
<AnnotationBar
  annotations={annotations}
  theme={theme}
  pinsVisible={pinsVisible}
  onPinsVisibleChange={setPinsVisible}
  hasUnsavedChanges={hasUnsavedChanges}
  onSelect={selectAnnotation}
  onDelete={deleteAnnotation}
  onClear={clearAnnotations}
  onClose={exitAnnotationMode}
  onSend={async batch => {
    await submitToAgent(batch);
    removeAcceptedAnnotations(batch);
  }}
/>
```

`onSend` receives an independent snapshot of the saved annotations. Resolve only
when the host's agent submission API accepts the batch; reject on failure. The bar
keeps drafts visible and supports retry, and never clears host state itself.
Remove only the accepted annotations after success, preserving unrelated draft
text, uploads, annotations, and any newer edits. Prevent mutations while sending
by publishing `annotations.readOnly`, or preserve changed records when clearing.

Register `annotationEditorStateRoute` under `annotation:editor` to receive
`{ hasUnsavedChanges }` from the iframe. Forward that state to the bar so Send waits
for the open annotation to be saved. Publish `annotations.showHint: false` when the
bar replaces the in-app instruction hint. Publish `annotations.pinsVisible` to
hide or reveal pins without removing canonical `targets` used for editing.

The playground submits to a local preview-host endpoint. Altertable connects the
same callback to its existing Ask Agent message submission path.

The bar appears once at least one annotation is saved. Before then, keep the
in-frame hint enabled. The count opens the review panel; pin visibility and Send
stay in the compact bar. Discarding all pending annotations requires confirmation.

Hosts can pass `requestDiscard(discard)` to use their existing confirmation dialog;
invoke `discard()` only when confirmed. The default confirmation uses the package's
standard sheet styling with centered placement.

Forward `draft.context.anchor` into each presentation target to position its pin
at the original click. `context.cursor` records the selection-time viewport point.
The `app` target kind identifies global layout instructions. Screenshot payloads
are bounded PNGs in `context.screenshot`; transmit those bytes through the agent's
image attachment API and retain metadata/filename association in its instructions.

# App diagnostics and repair

Live SDK capture collects failed operations, named queries and mounted widget
renders. Healthy widgets stay interactive. A render failure keeps its last
measured frame dimensions and static header, description, and footer. An initially
broken widget uses a compact fallback. Widget buttons say “Fix error”; the banner
says “Fix all errors”. Both send the complete observed report through the same action.
Reports include failure names and source locations, exercised coverage,
unfinished checks and an omitted-diagnostic count. They do not prove unvisited
views or interactions work. Bundle viewers resolve generated locations using the
bundle's inline base64 JSON source map. Missing, invalid or unmapped locations
retain the generated file and position. URL viewers retain generated locations.
Mapping runs in the viewer; it never fetches maps or includes source content in
reports. File paths remain reduced to their basename.

## Embed a repair session

Create one controller per app repair session, outside the viewer's mount lifecycle.
Restore its state **before** creating a viewer. Retain the controller and its state
object across app revisions, iframe reloads and viewer recreation. Start a new
session only for a different app or an explicit user reset.

```tsx
import { createDataAppRepairSession } from '@altertable/data-app-embed';
import {
  DataAppBridge,
  DataAppRepairBanner,
} from '@altertable/data-app-embed/react';

// The host supplies restoredState, saveState and requestAgentRepair.
const session = createDataAppRepairSession({
  state: restoredState, // New app: { automaticRequests: 0, attemptedRevisions: [] }
  saveState,
  requestRepair: requestAgentRepair,
});

function Viewer({ javascript, revision, onMessage }) {
  return (
    <>
      <DataAppRepairBanner session={session} />
      <DataAppBridge
        source={{ type: 'bundle', javascript }}
        title="Data app"
        repair={{ session, revision }}
        onMessage={onMessage}
      />
    </>
  );
}
```

Use a stable revision identifier, changing it when app source changes. The host
owns agent authorization and retention using its session facilities. The SDK adds
no server persistence. Reservations update the supplied state object synchronously
and save before automatic delivery. Retain that updated object even when saving
fails; do not recreate from an older saved snapshot. Hosts unable to guarantee
state retention must omit `requestRepair` and offer manual recovery.

At most three automatic requests are reserved per session, once per revision.
Manual requests and healthy reports never replenish the allowance. All CTAs use
the same controller and latest report. Requests are serialized. Failed saves stop
automatic requests for the controller; failed delivery consumes the reservation.
Neither retries automatically. A replaced bridge cannot submit reports or deliver
a request still waiting to save.

`requestRepair(report, { revision, automatic })` resolves when the host accepts the
request. This does not establish agent execution: the banner says “Repair request
accepted.” Omit this callback in unsupported hosts; the banner exposes diagnostics
and a “Copy diagnostics” action. This copies the complete sanitized report,
including coverage, unfinished checks and omitted counts. If clipboard access
fails, selectable report text remains available. Copying does not request repair
or consume an automatic attempt. Local preview uses this fallback.

Treat reports as untrusted app content. Diagnostic text is bounded and redacts
common credential forms, quoted values and URL parameters. Do not put credentials,
query parameters, result rows or other sensitive values in errors. The host must
keep its normal authorization checks; diagnostics grant no additional data access.

## Validate from Node

The separate validation entry has no Bun or browser dependency. Supply independent
checks for queries or interactions that a failed operation would otherwise hide.
Use the backend's existing authorized lakehouse and enforced parameters.

```ts
import {
  operationValidationChecks,
  validateDataApp,
} from '@altertable/data-app/validation';

const report = await validateDataApp({
  checks: [
    ...operationValidationChecks({ operations, lakehouse, queryParams }),
    {
      kind: 'query',
      name: 'revenue',
      source: { file: 'app.tsx', line: 42, column: 1 },
      run: signal => checkRevenueQuery(signal),
    },
  ],
});
```

Every declared check is observed independently. Validation stops waiting after
30 seconds (override with `timeoutMs`), reports unfinished checks, and signals
cancellation. Checks should honor that signal. Operation checks exercise the declared
representative inputs. Queries after an early return or failure require separate
checks. Render and browser interactions require caller-supplied checks; this API
does not launch a browser. Validation is opt-in and is excluded from normal app
entries and production preview bundles.

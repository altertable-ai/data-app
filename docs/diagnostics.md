# App diagnostics and repair

Live capture reports observed query, operation, and widget failures together.
Repair actions send the complete observed report. Unvisited views and interactions
remain unverified. Reports include unfinished checks and omitted failure counts.

## Host integration

Create one session outside the viewer lifecycle. Restore and retain its updated
state across revisions, reloads, and viewer recreation, even if saving fails.
Change the revision identifier when app source changes.

```tsx
import { createDataAppRepairSession } from '@altertable/data-app-embed';
import {
  DataAppBridge,
  DataAppRepairBanner,
} from '@altertable/data-app-embed/react';

const session = createDataAppRepairSession({
  state: restoredState, // New app: { automaticRequests: 0, attemptedRevisions: [] }
  saveState,
  requestRepair: requestAgentRepair,
});

const viewer = (
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
```

The host owns authorization, delivery, and state retention. Three automatic
requests are allowed per session; manual requests and healthy revisions do not
reset the allowance. Callback resolution means acceptance, not agent execution.
Omit `requestRepair` when delivery or reliable state retention is unavailable;
the banner offers diagnostics to copy instead. Avoid sensitive values in errors.
Source locations use generated filenames and positions.

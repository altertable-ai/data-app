# Reproducible widget recovery

This app uses public package APIs and an injected lakehouse. Requests pass through
normal query registration, operation validation, deadlines, cancellation, and view
state. Only the external lakehouse is simulated. No credentials, Docker, or remote
data are needed.

From the repository root:

```fish
bun install --frozen-lockfile
bun run build
bun run dev:recovery
```

Open the printed URL. The app also runs at `/recovery` on the development server.
Browser tests in `tests/public-api/apps-recovery.test.ts` exercise this same example:

```fish
bash scripts/install-test-browser.sh
bun run test tests/public-api/apps-recovery.test.ts
```

The toolbar belongs to Sales by default. Use **Use Acquisition** (or
`?primary=acquisition`) to exercise acquisition stories and exports. Each section
has independent refresh and cancel controls; changing Market updates both views.

## Reproduce the flows

Reload to reset request counts and displayed data. Every query waits for
**Complete Sales** or **Complete Acquisition**. Choose a response before completing
it. Ordinary requests have a five-minute operation deadline. There are no random
errors or artificial response delays.

| Flow                      | Steps and expected result                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Initial loading           | Reload. Both groups show skeletons; the primary story and export actions are disabled.                                                                                                                                                                                               |
| Independent success       | Complete Sales. Both sales widgets share the result; acquisition still waits.                                                                                                                                                                                                        |
| Initial failure and retry | Choose Unavailable for acquisition and complete it. Its metric, table, narrative, and chart show errors. Retry one acquisition widget: only acquisition's request count increases. Choose Success and complete it to recover all acquisition widgets.                                |
| Failed refresh            | Complete both requests, choose Unavailable for acquisition, and change Market to Europe. Old results remain visible while waiting. Complete both requests. Sales shows Europe; acquisition keeps All markets with a warning. Its CSV and story retain that displayed scope and data. |
| Measured zero             | Choose Measured zero and complete acquisition. Zero renders as data in the metric, table, narrative, and chart.                                                                                                                                                                      |
| Empty result              | Choose Empty result, refresh, and complete acquisition. Its widgets show the empty fallback. Its old data is removed. If acquisition owns the toolbar, story and export disable.                                                                                                     |
| Busy source               | Choose Rate limited and complete a request. The widget explains the busy source and offers Retry.                                                                                                                                                                                    |
| Access or SQL failure     | Choose Access denied or Rejected SQL. The widget directs the reader to the app owner and omits query Retry. The toolbar can refresh after the underlying problem is fixed.                                                                                                           |
| Invalid source rows       | Choose Invalid query rows. Operation parsing fails instead of inventing data. Choose Success, Retry, and complete the new request to recover.                                                                                                                                        |
| Rendering failure         | After acquisition succeeds, click Break visualization. Only the chart fails. Retry before repair reproduces the failure. Click Repair visualization, then Retry: the chart recovers without another query.                                                                           |
| Cancellation              | After both views succeed, Refresh acquisition, then Cancel acquisition. Its pending request aborts, updating feedback stops, and the displayed results retain their original scope, including after changing Market. Complete buttons disable for canceled requests.                 |
| Deadline                  | Open the URL with `?flow=timeout`. Complete Sales and leave acquisition waiting. Its actual 2.5-second operation deadline produces a local timeout. Retry and complete acquisition before the next deadline.                                                                         |
| Frozen story              | Select Acquisition as the toolbar view, refresh acquisition, open Present story, then let a waiting response finish. The open story keeps its starting snapshot. Close and reopen to read the new displayed result.                                                                  |
| Frozen export             | Select Acquisition as the toolbar view. Open Export while acquisition waits or has a retained error. Complete the request while the menu remains open. Menu choices and downloads keep the starting snapshot; reopen to see the new result.                                          |

The browser tests complete requests behind open overlays through DOM events on
these same visible controls. Interactive exploration normally uses the controls
before opening the overlay; a real source may complete while an overlay is open.

## Use the pattern with real data

Keep the operations, views, bindings, and widget composition. Replace the injected
`simulation.lakehouse` with the authorized host lakehouse, or use server operations
with `createDataClient<typeof operations>()`. Replace fixture SQL with inspected
sources and update the parsers and evidence.

A view is the unit of consistency and retry. Sales widgets share one result;
acquisition is independent. Keep a total and its breakdown on one view. Return
validated domain data from operations; let the platform own request state.

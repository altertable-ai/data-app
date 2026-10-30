# Author a local data app

Use the local scaffold supplied by your authoring workflow. Its README covers
setup and its AGENTS.md identifies app-owned files.
Replace the connectivity screen or fixture examples with the content specified by
the app brief, using the [shared SDK patterns](app-authoring.md). Local execution
does not require a particular content structure or presentation story.

| Task                         | Documentation                            |
| ---------------------------- | ---------------------------------------- |
| Customize local serving      | [Bun server](server-bun.md)              |
| Authorize hosted viewers     | [Server](server.md)                      |
| Customize the browser client | [HTTP client](client.md#http-operations) |

You can also [convert the local app to a hosted data app](hosted-apps.md#convert-a-local-data-app).

## Preview the use-case starters

From the SDK repository, run `bun run dev:gallery` with Docker available. It starts
and seeds the Altertable mock with fictional sample rows and the
`starter_sample_counts` semantic view. The mock image includes DuckDB 2 and the
`semantic_layer` extension; an older cached image is not sufficient.

| Starter | Hosted preview                                    | Local preview            |
| ------- | ------------------------------------------------- | ------------------------ |
| Metric  | <http://127.0.0.1:27418/starter-metric-data-app>  | <http://127.0.0.1:27421> |
| Finding | <http://127.0.0.1:27418/starter-finding-data-app> | <http://127.0.0.1:27422> |

The metric starter queries `SEMANTIC_VIEW` for group and segment breakdowns.
Its group action filters both charts; choose All groups to reset. The Finding
starter uses ordinary SQL over the same sample rows to support prose, inline
values, a compact ranking, and a table. Its example headings are not a prescribed
Finding structure.

Copied starters use the normal query connection. Replace their example queries
with verified sources in the target lakehouse; the mock and seed belong only to
local development. Never create demo objects in a user's lakehouse.

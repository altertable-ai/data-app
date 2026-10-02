# Author a local data app

Start from the CLI scaffold or the [local starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter-local-data-app).
Use the starter's README for setup and its AGENTS.md to find app-owned files.
Replace the connectivity screen with the exploration, CSV export, and story from the
[shared authoring flow](app-authoring.md).

| Task                                    | Documentation                            |
| --------------------------------------- | ---------------------------------------- |
| Serve locally with Bun                  | [Bun server](server-bun.md)              |
| Execute and authorize server operations | [Server](server.md)                      |
| Call operations from the browser        | [HTTP client](client.md#http-operations) |

You can also [convert the local app to a hosted data app](hosted-apps.md#convert-a-local-data-app).

## Statements and query variables

Local operations may keep arbitrary SQL statements with `query(name, statement)`.
They may also declare [query templates and variables](contract.md#execute-named-queries)
and call `query(name, values)`. The Bun `localLakehouse()` adapter builds the SQL
before sending `{ statement, limit }` through the CLI proxy. Local execution does
not require hosted registration or send registered query IDs to the Lakehouse API.
The existing HTTP operation request between the browser and Bun is unchanged.

An explicit custom Lakehouse adapter must handle `options.variables` with
`buildQueryStatement()` before executing a template. Arbitrary local statements
without those bindings pass through unchanged.

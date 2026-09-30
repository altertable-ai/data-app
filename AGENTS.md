# @altertable/data-app

## Build an app with this package

Start with [app authoring](docs/app-authoring.md) for the data flow and ownership
boundaries. Read the documentation for the entry you use:

| Task                             | Documentation                                                      |
| -------------------------------- | ------------------------------------------------------------------ |
| Define operations and inputs     | [Contract](docs/contract.md)                                       |
| Call operations from the browser | [Client](docs/client.md)                                           |
| Authorize and execute requests   | [Server](docs/server.md)                                           |
| Serve locally with Bun           | [Bun server](docs/server-bun.md)                                   |
| Compose views and request states | [React](docs/react.md), [stylesheet](docs/react-styles.md)         |
| Embed apps in a host             | [Embedding](docs/embed.md), [React embedding](docs/react-embed.md) |
| Deploy a Cloudflare runtime      | [Worker asset](docs/worker.md)                                     |
| Configure identity and theme     | [Config](docs/config.md), [appearance](docs/appearance.md)         |
| Format values                    | [Format](docs/format.md)                                           |

Import public subpath entries such as `@altertable/data-app/client`,
`@altertable/data-app/react`, `@altertable/data-app/react/styles.css`,
`@altertable/data-app/contract`, and `@altertable/data-app/config`. The package
has no root export. `@altertable/data-app-runtime` is not an import path.

Write one app. Named operations, `createDataClient`, and `useDataView` are the
data path locally and in the Altertable product host. Pass the operation
registry into `createDataClient({ operations })` so a host without `data:query`
can run those operations; the host keeps credentials and executes SQL. A
local-only bundle may use `import type` and omit the registry. Do not send SQL
from app code with `getDataAppTransport()`. See
[app authoring](docs/app-authoring.md). Import the React stylesheet once in the
browser entry. Edit app-owned files, not installed package files.

Inspect source data and time coverage before choosing an exploration. Build
findings from observed results and preserve loading, empty, error, and stale
states. The consuming app's instructions define its paths, commands, and analysis
context; the [starter template](docs/starter-agent-instructions.md) shows how to
connect them to this guide.

## Contribute to the package source

When working in this package's source repository, read
[Contributing](CONTRIBUTING.md) for setup, architecture, and checks. Update docs
when changing public APIs and run `bun run check` before committing. Do not edit
generated `dist` files.

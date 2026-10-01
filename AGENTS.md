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

Import public entries and call `injectDataAppStyles()` once before mounting in
the browser entry. Edit app-owned files. HTTP apps keep operations on the server and import their types
in browser code; bundle apps execute operations through the authorized host SQL
bridge. Credentials and enforced access/query limits stay on the backend.

Inspect data and time coverage before choosing an exploration. Build findings
from observed results and verify loading, empty, error, and stale states.

## Contribute to the package source

When working in this package's source repository, read
[Contributing](CONTRIBUTING.md) for setup and checks. Update docs
when changing public APIs and run `bun run check` before committing. Do not edit
generated `dist` files.

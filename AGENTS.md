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
| Serve a trusted bootstrap        | [Standalone bootstrap](docs/bootstrap.md)                          |
| Configure identity and theme     | [Config](docs/config.md), [appearance](docs/appearance.md)         |
| Format values                    | [Format](docs/format.md)                                           |

Import public package entries. Keep SQL, credentials, and execution on the server;
use `import type` for operation types in browser code. Import the React stylesheet
once in the browser entry. Edit app-owned files, not installed package files.

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

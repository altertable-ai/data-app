# Altertable Data App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Build interactive data explorations with TypeScript, React, and Altertable.
Compose filters, charts, tables, and narrative, with APIs for stories and CSV export.
Run in Altertable, MCP Apps hosts, or a local browser.

## Install

```fish
bun add @altertable/data-app @altertable/data-app-react react react-dom
```

Local apps also install `@altertable/data-app-bun`.

## Build an app

Use [app authoring](docs/app-authoring.md) for technical integration and available
starters. The app brief defines the content for the kind of data app. Search
[REFERENCE.md](REFERENCE.md) for exports and props. Read runtime details only when
changing execution mode or converting an app:

| App                     | Guide                                        |
| ----------------------- | -------------------------------------------- |
| Hosted / remote / cloud | [Single-file authoring](docs/hosted-apps.md) |
| Local Bun project       | [Local authoring](docs/local-data-apps.md)   |

For host integrations, use [embedding](docs/embed.md) or
[React embedding](docs/react-embed.md), with [diagnostics and repair](docs/diagnostics.md)
for shared repair. Tooling packages provide
[manifest extraction](packages/data-app-manifest/README.md),
[starter templates](packages/data-app-examples/README.md), and a
[Worker asset](docs/worker.md). Packages share one release version.

## Development

See [Contributing](CONTRIBUTING.md) for setup and verification.

## License

[MIT](LICENSE)

# Altertable Data App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

TypeScript contracts, a data client, server handlers, and React UI for building
interactive apps with Altertable data.

## Installation

```fish
# npm
npm install @altertable/data-app

# pnpm
pnpm add @altertable/data-app

# Bun
bun add @altertable/data-app
```

## Build an app

Apps render in an iframe in Altertable, a chat app, or locally in a browser.
Follow [app authoring](docs/app-authoring.md) to explore data, export displayed results as CSV, and present findings.

| App                                | Start here                               |
| ---------------------------------- | ---------------------------------------- |
| Data app (hosted / remote / cloud) | [Single-file guide](docs/hosted-apps.md) |
| Local data app                     | [Local guide](docs/local-data-apps.md)   |

For agent-assisted work, direct your agent to [AGENTS.md](AGENTS.md).
The package ships its guides and single-file starter alongside the built exports.

## Host apps

For integrating apps into a host, see [embedding](docs/embed.md).

## Development

See [Contributing](CONTRIBUTING.md) for repository structure and focused checks.
Releases use [Release Please and npm trusted publishing](docs/releasing.md).

## License

[MIT](LICENSE)

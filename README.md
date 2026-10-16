# Altertable Data App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Build data apps powered by Altertable.**

A TypeScript and React toolkit with APIs, components, and authoring guides for
developers and AI agents to build data apps powered by Altertable.

A data app combines interactive exploration with explanations and findings,
helping users answer questions with data. Compose filters, charts, tables, and
narrative, then let users present findings and export results.

## Install

Choose the packages for your runtime:

| Package                       | Use                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `@altertable/data-app`        | Definitions, contracts, formatting, browser clients, portable server handlers |
| `@altertable/data-app-react`  | React app authoring and `/ui` components                                      |
| `@altertable/data-app-embed`  | Framework-neutral iframe hosting and `/react` host adapter                    |
| `@altertable/data-app-bun`    | Bun local serving and `/preview` tooling                                      |
| `@altertable/data-app-worker` | Self-contained sandbox Worker deployment                                      |

```fish
bun add @altertable/data-app @altertable/data-app-react react react-dom
# Local apps also use the Bun adapter:
bun add @altertable/data-app-bun
```

Install only the base package for portable clients and servers. Framework-neutral
hosts use the embed package; React hosts add React and import
`@altertable/data-app-embed/react`. Neither requires the app UI stack.
All packages share a coordinated release version.

## Usage

Apps can be embedded in Altertable, ChatGPT, Claude, and other hosts that support
MCP Apps through a host integration, or run locally in a browser.

| App             | Guide                                  | Starter                                                    |
| --------------- | -------------------------------------- | ---------------------------------------------------------- |
| Remote data app | [Remote guide](docs/hosted-apps.md)    | [Single file](examples/starter-data-app/index.tsx)         |
| Local data app  | [Local guide](docs/local-data-apps.md) | [Local project](examples/starter-local-data-app/README.md) |

For agent-assisted work, direct your agent to [AGENTS.md](AGENTS.md).

## Development

See [Contributing](CONTRIBUTING.md) to develop and test the package.

## License

[MIT](LICENSE)

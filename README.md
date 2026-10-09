# Altertable Data App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Build data apps powered by Altertable.**

A TypeScript and React toolkit with APIs, components, and authoring guides for
developers and AI agents to build data apps powered by Altertable.

A data app combines interactive exploration with explanations and findings,
helping users answer questions with data. Compose filters, charts, tables, and
narrative, then let users present findings and export results.

## Install

```fish
npm install @altertable/data-app
# or
pnpm add @altertable/data-app
# or
bun add @altertable/data-app
```

## Build an app

Apps can be embedded in Altertable, ChatGPT, Claude, and other hosts that support
MCP Apps through a host integration, or run locally in a browser.

| App             | Guide                                  | Starter                                                                                              |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Remote data app | [Remote guide](docs/hosted-apps.md)    | [Single file](examples/starter-data-app/index.tsx)                                                   |
| Local data app  | [Local guide](docs/local-data-apps.md) | [Local project](https://github.com/altertable-ai/data-app/tree/main/examples/starter-local-data-app) |

For agent-assisted work, direct your agent to [AGENTS.md](AGENTS.md).

## Development

See [Contributing](CONTRIBUTING.md) to develop and test the package.

## License

[MIT](LICENSE)

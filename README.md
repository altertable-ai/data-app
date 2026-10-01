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

For React apps, also install React 19.2 or newer and React DOM 19.2 or newer, then import the stylesheet
once in your browser entry:

```tsx
import '@altertable/data-app/react/styles.css';
import { mountDataApp } from '@altertable/data-app/react';
```

## Documentation

| Entry                                     | Use                                                 |
| ----------------------------------------- | --------------------------------------------------- |
| [/contract](docs/contract.md)             | Define typed operations, parsers, and date ranges   |
| [/client](docs/client.md)                 | Call HTTP operations or run bundle operations       |
| [/server](docs/server.md)                 | Authorize and execute requests on a hosted server   |
| [/server/bun](docs/server-bun.md)         | Serve an app locally with Bun                       |
| [/embed](docs/embed.md)                   | Host URL apps or sandboxed JavaScript bundles       |
| [/worker](docs/worker.md)                 | Upload the self-contained Cloudflare Worker asset   |
| [/react/embed](docs/react-embed.md)       | Embed apps with a shared React iframe bridge        |
| [/react](docs/react.md)                   | Compose views, filters, widgets, and request states |
| [/react/styles.css](docs/react-styles.md) | Load the React UI stylesheet                        |
| [/config](docs/config.md)                 | Define app identity and scope                       |
| [/appearance](docs/appearance.md)         | Configure brand tokens and viewer theme             |
| [/format](docs/format.md)                 | Format dates, counts, ratios, and currencies        |

Start with [app authoring](docs/app-authoring.md) for the complete data flow.
The package ships these docs alongside its built JavaScript and declarations.
For agent-assisted work, direct your agent to
`node_modules/@altertable/data-app/AGENTS.md`.

## Starter example

The [runnable starter](https://github.com/altertable-ai/data-app/tree/main/examples/starter) includes app configuration,
server operations, a React connectivity screen, and agent instructions.
Use it as the starting point for an app that consumes the public package.

## Development

```fish
bun install --frozen-lockfile
bun run check
```

See [Contributing](CONTRIBUTING.md) for repository structure and focused checks.
Releases use [Release Please and npm trusted publishing](docs/releasing.md).

## License

[MIT](LICENSE)

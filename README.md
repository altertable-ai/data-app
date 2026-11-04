# Altertable Data App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

The SDK for [Altertable data apps](https://altertable.ai/docs/data-apps):
interactive apps that agents build over your data with TypeScript and React.
Compose filters, charts, tables, and narrative on top of declared queries, then run
the app in Altertable, MCP Apps hosts, your own product, or a local browser.

## Get started

- **In Altertable, Slack, or an MCP client:** describe the question and let the
  agent build the app. See [Build a data app](https://altertable.ai/docs/data-apps/build).
- **Locally:** scaffold, run, and publish with the Altertable CLI. See
  [local development](https://altertable.ai/docs/data-apps/local-development).
- **By hand:** install the SDK and follow [app authoring](docs/app-authoring.md).

## Install

```fish
bun add @altertable/data-app @altertable/data-app-react react react-dom
# or
npm install @altertable/data-app @altertable/data-app-react react react-dom
# or
pnpm add @altertable/data-app @altertable/data-app-react react react-dom
```

Local apps also install `@altertable/data-app-bun`.

## Build an app

Use [app authoring](docs/app-authoring.md) for technical integration and available
starters.

| App                     | Guide                                        |
| ----------------------- | -------------------------------------------- |
| Hosted / remote / cloud | [Single-file authoring](docs/hosted-apps.md) |
| Local Bun project       | [Local authoring](docs/local-data-apps.md)   |

## Embed apps

Host apps in your product with [embedding](docs/embed.md) or
[React embedding](docs/react-embed.md).

## Packages

| Package                                                       | Use it to                                             |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| [`@altertable/data-app`](packages/data-app)                   | Define apps and queries                               |
| [`@altertable/data-app-react`](packages/data-app-react)       | Build app UI with views, filters, charts, and tables  |
| [`@altertable/data-app-embed`](packages/data-app-embed)       | Host apps in your product through an iframe sandbox   |
| [`@altertable/data-app-bun`](packages/data-app-bun)           | Serve and preview apps locally against your lakehouse |
| [`@altertable/data-app-worker`](packages/data-app-worker)     | Serve apps from a self-contained sandbox Worker       |
| [`@altertable/data-app-manifest`](packages/data-app-manifest) | Extract and rewrite manifests in build tooling        |
| [`@altertable/data-app-examples`](packages/data-app-examples) | Start from canonical app templates                    |

## Development

See [Contributing](CONTRIBUTING.md) for setup and verification.

## Learn more

Read [Interfaces for the next question](https://altertable.ai/blog/2026-11-04-interfaces-for-the-next-question)
for why data apps exist.

## License

[MIT](LICENSE)

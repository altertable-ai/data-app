# @altertable/data-app

The SDK behind [Altertable data apps](https://altertable.ai/docs/data-apps):
interactive apps that agents build over your data. Queries are declared up front,
so every result stays governed, cacheable, and traceable to its source while the
interface adapts to each question.

## Do you need this package?

- **Building an app in Altertable, Slack, or an MCP client:** follow
  [Build a data app](https://altertable.ai/docs/data-apps/build). The agent uses
  this SDK for you; no install is needed.
- **Developing locally:** scaffold, run, and publish with the Altertable CLI
  (`altertable app create`). See
  [local development](https://altertable.ai/docs/data-apps/local-development).
- **Writing an app by hand or embedding apps in a product:** install the packages
  below.

## Installation

```fish
bun add @altertable/data-app
# or
npm install @altertable/data-app
# or
pnpm add @altertable/data-app
```

## Usage

Declare an app's identity and its named queries:

```ts
import { defineDataApp } from '@altertable/data-app';

const dataApp = defineDataApp({
  title: 'Activity',
  description: 'Explore activity across your organization.',
  scope: { organization: 'demo', environment: 'production' },
  queries: {
    eventsByDay: {
      statement: `
SELECT CAST(date_trunc('day', occurred_at) AS VARCHAR) AS day, count(*) AS events
FROM events
WHERE occurred_at >= $period.from AND occurred_at < $period.to
GROUP BY day ORDER BY day`,
      params: { period: { type: 'dateTimeRange' } },
      projections: {
        day: { type: 'string' },
        events: { type: 'number' },
      },
    },
  },
});
```

See [queries and operations](docs/contract.md) to run them.

## Packages

Add the packages your app needs:

| Package                                                                                        | Use it to                                                   |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `@altertable/data-app`                                                                         | Define apps and queries (`/contract`, `/client`, `/server`) |
| [`@altertable/data-app-react`](https://www.npmjs.com/package/@altertable/data-app-react)       | Build app UI with views, filters, charts, and tables        |
| [`@altertable/data-app-embed`](https://www.npmjs.com/package/@altertable/data-app-embed)       | Host apps in your product through an iframe sandbox         |
| [`@altertable/data-app-bun`](https://www.npmjs.com/package/@altertable/data-app-bun)           | Serve and preview apps locally against your lakehouse       |
| [`@altertable/data-app-worker`](https://www.npmjs.com/package/@altertable/data-app-worker)     | Serve apps from a self-contained sandbox Worker             |
| [`@altertable/data-app-manifest`](https://www.npmjs.com/package/@altertable/data-app-manifest) | Extract and rewrite manifests in build tooling              |
| [`@altertable/data-app-examples`](https://www.npmjs.com/package/@altertable/data-app-examples) | Start from canonical app templates                          |

## Documentation

- [Data apps documentation](https://altertable.ai/docs/data-apps): build, share,
  and develop apps in Altertable.
- [Interfaces for the next question](https://altertable.ai/blog/2026-11-04-interfaces-for-the-next-question):
  why data apps exist and how they are designed.
- [App authoring](docs/app-authoring.md): start here to write an app. Guides,
  [agent instructions](AGENTS.md), and the [API reference](REFERENCE.md) ship with
  this package.

## License

[MIT](LICENSE)

# @altertable/data-app

Portable definitions, contracts, formatting, browser clients, and request handlers
for Altertable data apps.

## Installation

```fish
bun add @altertable/data-app
```

## Usage

Declare an app's identity and query registry:

```ts
import { defineDataApp } from '@altertable/data-app';

const app = defineDataApp({
  title: 'Activity',
  description: 'Explore activity across your organization.',
  scope: { organization: 'demo', environment: 'production' },
  queries: {},
});
```

Use `/contract` for operations and validation, `/client` for browser requests,
and `/server` for request handling. Add `@altertable/data-app-react` to build app
UI or `@altertable/data-app-embed` to host an app. This package requires no React.

## Documentation

Start with [app authoring](docs/app-authoring.md) and [agent instructions](AGENTS.md).
Both ship with this package, alongside the [API reference](REFERENCE.md).

## License

[MIT](LICENSE)

# @altertable/data-app-react

React components, hooks, styles, and authoring tools for Altertable data apps.

## Installation

```fish
bun add @altertable/data-app @altertable/data-app-react react react-dom
```

React and React DOM 19.2 or newer are required.

## Usage

Mount a simple static screen into an element with `id="root"`:

```tsx
import { defineDataApp } from '@altertable/data-app';
import { injectDataAppStyles, mountDataApp } from '@altertable/data-app-react';
import { MetricWidget } from '@altertable/data-app-react/ui';

const app = defineDataApp({
  title: 'Activity',
  description: 'A snapshot of activity.',
  scope: { organization: 'demo', environment: 'production' },
  queries: {},
});

function App() {
  return (
    <MetricWidget
      label="Active projects"
      value={42}
      format={{ kind: 'count' }}
    />
  );
}

injectDataAppStyles();
mountDataApp({ app, component: App });
```

Use the main entry for declared views, bound widgets, and layouts; `/ui` supports
setup screens, static content, and custom composition. Install styles explicitly
with `injectDataAppStyles()`.

To embed an app in a React host, use `@altertable/data-app-embed/react`. These
packages do not depend on each other: this package builds the app UI; the embed
package manages its host iframe.

## Documentation

See the [React guide](https://github.com/altertable-ai/data-app/blob/main/docs/react.md)
and [single-file starter](https://github.com/altertable-ai/data-app/blob/main/examples/starter-data-app/index.tsx)
for apps with queries, filters, and bound widgets.

## License

[MIT](LICENSE). Vendored code is covered by [third-party notices](THIRD_PARTY_NOTICES).

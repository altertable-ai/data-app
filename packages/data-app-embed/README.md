# @altertable/data-app-embed

Iframe hosting, sandbox bootstrap, and React host bindings for Altertable data apps.

## Installation

```fish
bun add @altertable/data-app-embed
```

React hosts also install React 19.2 or newer:

```fish
bun add react
```

## Usage

Connect an iframe to your host's message router:

```ts
import { attachDataAppBridge } from '@altertable/data-app-embed';

const host = attachDataAppBridge({
  iframe,
  source: { type: 'url', url: 'https://apps.example.com/report' },
  onMessage: router.dispatch,
});

// When the host removes the iframe:
host.dispose();
```

The host supplies `iframe` and `router`, including authorization for data access.
The app URL must have a different origin from the host.

React hosts can let `<DataAppBridge>` own the iframe:

```tsx
import { DataAppBridge } from '@altertable/data-app-embed/react';

<DataAppBridge
  title="Activity report"
  source={{ type: 'url', url: 'https://apps.example.com/report' }}
  onMessage={router.dispatch}
/>;
```

Use `@altertable/data-app-react` for the UI inside the iframe.

## Documentation

See [embedding](https://github.com/altertable-ai/data-app/blob/main/docs/embed.md)
for message routing, sandbox policy, and bundle sources, or
[React embedding](https://github.com/altertable-ai/data-app/blob/main/docs/react-embed.md)
for lifecycle and loading states.

## License

[MIT](LICENSE)

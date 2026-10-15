# @altertable/data-app-embed

Framework-neutral iframe hosting, sandbox bootstrap, and a lightweight React host adapter.

```ts
import { attachDataAppBridge } from '@altertable/data-app-embed';
```

React hosts can use `<DataAppBridge>`:

```ts
import { DataAppBridge } from '@altertable/data-app-embed/react';
```

The framework-neutral entry does not require React. The `/react` entry requires
React 19.2 or newer and does not install app widgets, charts, or React DOM.

See the [guide](https://github.com/altertable-ai/data-app/blob/main/docs/embed.md)
and [repository](https://github.com/altertable-ai/data-app) for examples.

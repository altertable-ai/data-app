# App configuration

Import `DataAppConfig` and `dataAppTitle` from `@altertable/data-app/config`.
Configuration is shared by the app shell and browser mounting code.

```ts
import type { DataAppConfig } from '@altertable/data-app/config';

export const config = {
  title: 'Activity',
  scope: { organization: 'example', environment: 'production' },
  appearance: {},
} satisfies DataAppConfig;
```

`title` names the exploration. `scope` identifies its organization and
environment for display; it does not grant access to data.
`appearance` is validated by the [appearance APIs](appearance.md).

`dataAppTitle(config)` produces a document title containing the app title and
scope. [React mounting](react.md) applies it automatically.

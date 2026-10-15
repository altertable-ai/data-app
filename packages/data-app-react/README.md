# @altertable/data-app-react

React bindings, widgets, layouts, controls, styles, exports, and annotations for Altertable data apps.

```fish
bun add @altertable/data-app @altertable/data-app-react react react-dom
```

```ts
import {
  createDataHooks,
  injectDataAppStyles,
} from '@altertable/data-app-react';
import { MetricWidget } from '@altertable/data-app-react/ui';
```

Use declared views and bound widgets for dynamic app content. The `/ui` entry
supports setup screens and deliberately custom composition. Call
`injectDataAppStyles()` explicitly; importing components does not change the DOM.
React and React DOM 19.2 or newer are required.

See the [guide](https://github.com/altertable-ai/data-app/blob/main/docs/react.md)
and [repository](https://github.com/altertable-ai/data-app) for examples.

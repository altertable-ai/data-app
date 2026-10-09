# React

Import hooks, components, and UI helpers from `@altertable/data-app/react`.
React 19.2 or newer and React DOM 19.2 or newer are peer dependencies.

## Mount the app

Use `mountDataApp({ app, component })` to mount into `#root`. When mounting
through another framework, wrap the root in `<DataAppProvider app={app}>` from `/react/ui`.
`<DataApp>` inherits identity and appearance from that root. Mounting sets the document title before React renders.

```tsx
import { injectDataAppStyles, mountDataApp } from '@altertable/data-app/react';

injectDataAppStyles();
mountDataApp({ app, component: App });
```

Call `injectDataAppStyles()` before mounting; no separate stylesheet is needed.
For a restrictive CSP, pass the permitted nonce on the first call.
See [Styling](styling.md) for appearance, CSS tokens, and overrides.

Use `/react` for declared views, bound widgets, and layouts. Use
[`/react/ui`](ui.md) for setup/static screens and direct UI composition.

## Choose a task

| Task                                                     | Guide                                                     |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Declare a view and handle loading, refresh, and failures | [Views](views.md)                                         |
| Configure date, text, select, and dimension controls     | [Variables](variables.md)                                 |
| Render metrics, charts, tables, and narrative            | [Widgets](widgets.md)                                     |
| Compose sections and responsive grids                    | [Layout](layout.md)                                       |
| Register sources, definitions, metrics, and evidence     | [Data context](data-context.md)                           |
| Present findings and export displayed data               | [Stories and export](stories-and-export.md)               |
| Format values and configure appearance                   | [Formatting and appearance](formatting-and-appearance.md) |
| Host an iframe from React                                | [React embed](react-embed.md)                             |

Start with [app authoring](app-authoring.md) and the
[single-file starter](../examples/starter-data-app/index.tsx).

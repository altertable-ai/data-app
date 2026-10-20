# React

Import views, bound widgets, and layouts from `@altertable/data-app-react`.
React and React DOM 19.2 or newer are required. Start with
[app authoring](app-authoring.md).

## Mount the app

```tsx
import { injectDataAppStyles, mountDataApp } from '@altertable/data-app-react';

injectDataAppStyles();
mountDataApp({ app, component: App });
```

The app supplies `app`, `App`, and a `#root` element. For a restrictive CSP, pass
the permitted nonce to the first `injectDataAppStyles()` call. When mounting
through another framework, wrap the root in `<DataAppProvider app={app}>` from
`@altertable/data-app-react/ui`.

Use [views](views.md) for requests, [variables](variables.md) for filters,
and [widgets](widgets.md) for displays. Use [direct UI composition](ui.md) for
setup, static screens, and custom controls. Hosts embedding an app use the
separate [React embed package](react-embed.md).

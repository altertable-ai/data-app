# React

Import views, bound widgets, and layouts from `@altertable/data-app-react`.
React and React DOM 19.2 or newer are required. Start with
[app authoring](app-authoring.md).

## Mount the app

```tsx
import { mountDataApp } from '@altertable/data-app-react';

mountDataApp({ app: dataApp, component: App });
```

The app supplies `dataApp`, `App`, and a `#root` element.

Keep the selected starter's mounting and client wiring. The
app brief selects the starter and content structure; the available runtime
starters are listed in [app authoring](app-authoring.md#use-release-matched-starters).
Render a setup or static screen with `<DataApp>` without a `view`.

Hosts embedding an app use the separate `@altertable/data-app-embed` package;
that integration is outside ordinary app authoring.

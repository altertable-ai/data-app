# React styles

Call `injectDataAppStyles()` in the browser entry before mounting:

```ts
import { injectDataAppStyles, mountDataApp } from '@altertable/data-app/react';

injectDataAppStyles();
mountDataApp({ config, component: App });
```

The function synchronously inserts the complete compiled UI stylesheet into the
current document's head and returns its `<style>` element. Repeated calls return
the existing element, including calls from independently bundled package copies.

For a host rendering `DataAppSkeleton` or `Skeleton`, use `injectDataAppShellStyles()`
from the same React entry. It installs skeleton styles and the shared `Grid`, `DataWidget`,
`MetricWidget`, and `VisualizationWidget` surface styles used by the startup
placeholder, without the full UI component stylesheet:

```ts
import { injectDataAppShellStyles } from '@altertable/data-app/react';

injectDataAppShellStyles();
```

Both entry stylesheets import `src/react/shared.css`, so common component styles
have a single source. Each also includes the startup placeholder stylesheet. Both injectors accept
the same document and nonce options and install once per document, each using its
own style element. Host-owned header and footer content supplies its own styles.
`ContentSkeleton` styles are also included. Widget features such as inspection,
view tabs, and empty states use additional UI styles; use `injectDataAppStyles()`
when enabling those features.

For a CSP that restricts inline styles, pass a nonce permitted by `style-src`:

```ts
injectDataAppStyles({ nonce: trustedNonce });
```

The first call determines the element's nonce. To style another document, such as
an iframe, pass `{ document: iframe.contentDocument! }`.

Importing the React entry does not access the DOM or inject styles and is safe for
server rendering. Calling either injector without a browser document throws. For SSR,
call it on the client before mounting or hydrating.

Stylesheets live beside their components in `src/react/ui`. The build combines
them in the order declared by `src/react/styles.css` and `src/react/shellStyles.css` and embeds the result as a
JavaScript string. Consumers need no CSS loader or separate stylesheet asset.
Unused injection code and its CSS can be removed by tree-shaking.

Brand settings install semantic CSS variables through [appearance](appearance.md);
the [React app shell](react.md) manages these for normal app usage.

## Migration

Replace `import '@altertable/data-app/react/styles.css'` with an explicit call to
`injectDataAppStyles()`. The former CSS export is no longer available.

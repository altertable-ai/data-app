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

For a CSP that restricts inline styles, pass a nonce permitted by `style-src`:

```ts
injectDataAppStyles({ nonce: trustedNonce });
```

The first call determines the element's nonce. To style another document, such as
an iframe, pass `{ document: iframe.contentDocument! }`.

Importing the React entry does not access the DOM or inject styles and is safe for
server rendering. Calling the injector without a browser document throws. For SSR,
call it on the client before mounting or hydrating.

Stylesheets live beside their components in `src/react/ui`. The build combines
them in the order declared by `src/react/styles.css` and embeds the result as a
JavaScript string. Consumers need no CSS loader or separate stylesheet asset.
Unused injection code and its CSS can be removed by tree-shaking.

Brand settings install semantic CSS variables through [appearance](appearance.md);
the [React app shell](react.md) manages these for normal app usage.

## Migration

Replace `import '@altertable/data-app/react/styles.css'` with an explicit call to
`injectDataAppStyles()`. The former CSS export is no longer available.

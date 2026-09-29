# React styles

Import the stylesheet once from the browser entry:

```ts
import '@altertable/data-app/react/styles.css';
```

This entry is a CSS asset, with a declaration for TypeScript side-effect imports.
The app's bundler must process CSS imports. The React JavaScript entry does not
load it automatically, so server rendering can import components without
importing CSS into Node.

Stylesheets live beside their components in `src/react/ui` and are combined into
the published stylesheet during the build. Brand settings install semantic CSS
variables through [appearance](appearance.md); the [React app shell](react.md)
manages these for normal app usage.

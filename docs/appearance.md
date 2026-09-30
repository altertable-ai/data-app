# Appearance

Import `parseAppearance`, `applyAppearance`, and `createThemeController` from
`@altertable/data-app/appearance`. Parsing is safe on the server; applying tokens
and controlling theme require a browser document.

```ts
import { parseAppearance } from '@altertable/data-app/appearance';

const appearance = parseAppearance({
  mode: 'system',
  accentColor: '#405d47',
  density: 'comfortable',
});
```

`parseAppearance` fills omitted settings with defaults and rejects unknown keys
or invalid values. Settings include light/dark/system mode, neutral/slate/warm
base colors, accent colors, a chart palette, density, corner radius, elevation,
and body/heading typography. Colors are six-digit hexadecimal values.

`applyAppearance(appearance)` installs semantic CSS tokens on the document root
and returns a cleanup function for system-theme listening.
`createThemeController(appearance)` applies the initial theme and provides
`getMode`, `setMode`, and `subscribe`. Viewer mode persists in local storage
independently of app-authored brand settings. Storage failures do not prevent
the selection from applying to the current page.

`applyAppearance` sets `--at-background` and `--at-text` on the document root.
The [React stylesheet](react-styles.md) paints `html`, `body`, `#root`, and the
app layout from those tokens, so a dark theme fills the page canvas without
inline colors on the mount node.

`typography.heading` is the page title, widget titles, metric values, and ranking
labels. Use a UI text family. A display face such as Impact stays difficult to
read at ranking size.

The React `DataApp` shell manages appearance for normal app usage. See
[configuration](config.md), [React](react.md), and [styles](react-styles.md).

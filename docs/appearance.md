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

The React `DataApp` shell manages appearance for normal app usage. See
[configuration](config.md), [React](react.md), and [styles](react-styles.md).

`createThemeController(appearance, hostMode?)` can start with a parent-owned
`'light'` or `'dark'` mode. `controller.setHostMode(mode)` overrides viewer
preferences without writing to storage; `setMode` has no effect while a host mode
is active. `setHostMode(undefined)` restores the viewer mode. React `DataApp`
manages this automatically from trusted embedding context.

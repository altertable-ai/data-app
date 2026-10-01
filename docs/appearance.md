# Appearance

Import `parseAppearance`, `applyAppearance`, and `createThemeController` from
`@altertable/data-app/appearance`. Parsing is safe on the server. Applying tokens requires a browser document;
viewer preferences use browser storage.

```ts
import { parseAppearance } from '@altertable/data-app/appearance';

const appearance = parseAppearance({
  theme: 'system',
  accentColor: '#405d47',
  density: 'comfortable',
});
```

`parseAppearance` fills omitted settings with defaults and rejects unknown keys
or invalid values. Settings include light/dark/system theme, neutral/slate/warm
base colors, accent colors, a chart palette, density, corner radius, elevation,
and body/heading typography. Colors are six-digit hexadecimal values.

`applyAppearance(appearance)` installs semantic CSS tokens on the document root
and returns a cleanup function for system-theme listening.
`createThemeController(initialTheme)` manages the viewer's preference through
`getTheme`, `setTheme`, and `subscribe`. It reads and persists local storage
when available. Apply the preference with `applyAppearance` in the UI owner;
the controller itself does not modify the document.

The React `DataApp` shell manages appearance for normal app usage. See
[configuration](config.md), [React](react.md), and [styles](react-styles.md).

`Theme` is the resolved `'light' | 'dark'` theme. `ThemePreference` additionally
allows `'system'` for standalone viewers. A trusted host supplies a `theme: Theme`
through [parent presentation](embed.md#parent-presentation). React applies that
theme directly with app-owned brand tokens; standalone viewers use the preference
controller. Appearance effect cleanup releases the system preference listener.

When migrating theme controls, replace `getMode`/`setMode` with
`getTheme`/`setTheme`, and initialize the controller with a `ThemePreference`
rather than appearance settings. Subscribe to the controller and compose its
preference with `applyAppearance` to update document tokens.

Appearance configuration uses `theme` (formerly `mode`).

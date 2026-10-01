import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import {
  applyAppearance,
  createThemeController,
  parseAppearance,
  type Theme,
} from '@/src/core/appearance';

/** The parent theme takes precedence; only standalone viewers receive controls. */
export function useAppAppearance(appearance: unknown, hostTheme?: Theme) {
  const [controller] = useState(() =>
    createThemeController(parseAppearance(appearance).mode)
  );
  const viewerPreference = useSyncExternalStore(
    controller.subscribe,
    controller.getTheme,
    controller.getTheme
  );

  useLayoutEffect(
    () =>
      applyAppearance({
        ...parseAppearance(appearance),
        mode: hostTheme ?? viewerPreference,
      }),
    [appearance, hostTheme, viewerPreference]
  );

  return hostTheme ? undefined : controller;
}

import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import {
  applyAppearance,
  createThemeController,
  normalizeAppearance,
  type Theme,
  type AppearanceOptions,
} from '@/src/core/appearance';

/** The parent theme takes precedence; only standalone viewers receive controls. */
export function useAppAppearance(
  appearance: AppearanceOptions | undefined,
  hostTheme?: Theme
) {
  const [controller] = useState(() =>
    createThemeController(normalizeAppearance(appearance).theme)
  );
  const viewerPreference = useSyncExternalStore(
    controller.subscribe,
    controller.getTheme,
    controller.getTheme
  );

  useLayoutEffect(
    () =>
      applyAppearance({
        ...normalizeAppearance(appearance),
        theme: hostTheme ?? viewerPreference,
      }),
    [appearance, hostTheme, viewerPreference]
  );

  return hostTheme ? undefined : controller;
}

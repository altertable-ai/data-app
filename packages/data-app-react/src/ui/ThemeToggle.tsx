import { useCallback, useSyncExternalStore, type RefObject } from 'react';
import { type ThemeController } from '@altertable/data-app/appearance';
import { IconButton } from './IconButton.tsx';

function useResolvedTheme(theme: ThemeController) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const preference = window.matchMedia('(prefers-color-scheme: dark)');
      const unsubscribe = theme.subscribe(notify);
      preference.addEventListener('change', notify);

      return () => {
        unsubscribe();
        preference.removeEventListener('change', notify);
      };
    },
    [theme]
  );

  const snapshot = useCallback(() => {
    const preference = theme.getTheme();

    return preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference;
  }, [theme]);

  return useSyncExternalStore(subscribe, snapshot, () => 'light');
}

export function ThemeToggle({
  theme,
  portalRoot,
}: {
  theme: ThemeController;
  portalRoot?: RefObject<HTMLElement | null>;
}) {
  const selected = useResolvedTheme(theme);
  const next = selected === 'dark' ? 'light' : 'dark';
  const icon = next === 'dark' ? 'darkTheme' : 'lightTheme';

  return (
    <IconButton
      icon={icon}
      variant="ghost"
      label={`Switch to ${next} theme`}
      portalRoot={portalRoot}
      onClick={() => theme.setTheme(next)}
    />
  );
}

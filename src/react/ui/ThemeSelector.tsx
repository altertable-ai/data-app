import {
  useCallback,
  useId,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from 'react';
import type { ThemeController } from '@/src/core/appearance';
import { IconButton } from '@/src/react/ui/IconButton';
import { AppIcon } from '@/src/react/ui/icons';
import { classNames } from '@/src/react/ui/classNames';
import { Tooltip } from '@/src/react/ui/Tooltip';

const themes = [
  { value: 'light', label: 'Light', icon: 'lightTheme' },
  { value: 'dark', label: 'Dark', icon: 'darkTheme' },
] as const;

export type ThemeSelectorProps = {
  theme: ThemeController;
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<'fieldset'>, 'children'>;

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

/** Viewer color preference. Brand tokens remain app-owned. */
export function ThemeSelector({
  theme,
  children,
  className,
  ...props
}: ThemeSelectorProps) {
  const selected = useResolvedTheme(theme);
  const name = useId();

  return (
    <fieldset
      {...props}
      className={classNames('altertable-theme-selector', className)}
    >
      <legend className="altertable-theme-legend">Color theme</legend>
      {themes.map(({ value, label, icon }) => (
        <Tooltip key={value} content={`${label} theme`}>
          <label
            data-atbl-internal-surface="option"
            data-atbl-focus="ring"
            data-atbl-control="action"
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={selected === value}
              aria-label={`${label} theme`}
              onChange={() => theme.setTheme(value)}
            />
            <AppIcon name={icon} size={16} />
          </label>
        </Tooltip>
      ))}
      {children}
    </fieldset>
  );
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

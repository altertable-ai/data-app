import type { ComponentPropsWithRef, ReactNode, RefObject } from 'react';
import { Button, type ButtonProps } from '@/src/react/ui/Button';
import { AppIcon, type AppIconName } from '@/src/react/ui/icons';
import { Kbd } from '@/src/react/ui/Kbd';
import { ariaKeyShortcuts, type Shortcut } from '@/src/react/ui/shortcuts';
import { Tooltip } from '@/src/react/ui/Tooltip';

export type IconButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'aria-label'
> & {
  icon: AppIconName;
  label: string;
  variant?: ButtonProps['variant'];
  shortcut?: Shortcut | { label: string; aria: string };
  tooltip?: ReactNode;
  portalRoot?: RefObject<HTMLElement | null>;
  tooltipPlacement?: 'top' | 'bottom';
  tooltipAlign?: 'start' | 'center' | 'end';
  children?: ReactNode;
};

export function IconButton({
  icon,
  label,
  variant = 'outline',
  shortcut,
  tooltip,
  portalRoot,
  tooltipPlacement,
  tooltipAlign,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  const keyHint =
    shortcut &&
    ('modifier' in shortcut ? (
      <Kbd shortcut={shortcut} />
    ) : (
      <Kbd>{shortcut.label}</Kbd>
    ));
  const keyAria =
    shortcut &&
    ('modifier' in shortcut ? ariaKeyShortcuts(shortcut) : shortcut.aria);

  return (
    <Tooltip
      content={
        tooltip ?? (
          <>
            {label}
            {keyHint && <> {keyHint}</>}
          </>
        )
      }
      portalRoot={portalRoot}
      placement={tooltipPlacement}
      align={tooltipAlign}
    >
      <Button
        {...props}
        type={type}
        variant={variant}
        size="icon"
        aria-label={label}
        aria-keyshortcuts={props['aria-keyshortcuts'] ?? keyAria}
      >
        {children ?? <AppIcon name={icon} />}
      </Button>
    </Tooltip>
  );
}

import { Button } from '@/src/react/ui/Button';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuPopover,
  MenuTrigger,
} from '@/src/react/ui/Menu';
import {
  useRef,
  type ComponentRef,
  type RefObject,
  type Ref,
  type KeyboardEvent,
} from 'react';
import { useMergeRefs } from '@floating-ui/react';
import { AppIcon } from '@/src/react/ui/icons';

/** A resolved action available for one displayed exploration item. */
export type ExplorationAction = {
  id: string;
  label: string;
  onSelect: (trigger?: HTMLElement | SVGElement) => void;
  /** Keep this action directly available when other actions require a menu. */
  primary?: boolean;
};

/** Resolves the actions available for a displayed domain row. */
export type ItemActions<Row> = (row: Row) => readonly ExplorationAction[];

export type ExplorationActionControlProps = {
  actions: readonly ExplorationAction[];
  /** Identifies the item whose actions the control exposes. */
  ariaLabel: string;
  /** Use when another item-level hit target already exposes the primary action. */
  hidePrimary?: boolean;
  /** Shares this menu trigger with an item's context and keyboard actions. */
  ref?: Ref<HTMLButtonElement>;
  className?: string;
};

/**
 * Presents exploration actions consistently: a sole action is direct, an explicit
 * primary action stays direct, and remaining choices use an accessible menu.
 */
export function ExplorationActionControl({
  actions,
  ariaLabel,
  className,
  hidePrimary = false,
  ref,
}: ExplorationActionControlProps) {
  const menuTrigger = useRef<ComponentRef<'button'> | null>(null);
  const mergedTrigger = useMergeRefs([menuTrigger, ref]);
  const primary = getPrimaryExplorationAction(actions);
  const menuActions = primary
    ? actions.filter(action => action !== primary)
    : actions;

  if (actions.length === 0) return null;

  return (
    <span className={className}>
      {primary && !hidePrimary && (
        <Button
          onClick={event => primary.onSelect(event.currentTarget)}
          aria-label={`${ariaLabel}: ${primary.label}`}
        >
          {primary.label}
        </Button>
      )}
      {menuActions.length > 0 && (
        <MenuTrigger>
          <MenuButton
            ref={mergedTrigger}
            variant="ghost"
            size="icon-compact"
            aria-label={`${ariaLabel}: more actions`}
          >
            <AppIcon name="moreActions" />
          </MenuButton>
          <ExplorationActionMenu
            actions={menuActions}
            ariaLabel={ariaLabel}
            triggerRef={menuTrigger}
          />
        </MenuTrigger>
      )}
    </span>
  );
}

/** Menu content for an item-level trigger composed by a chart or custom control. */
export function ExplorationActionMenu({
  actions,
  ariaLabel,
  triggerRef,
}: Pick<ExplorationActionControlProps, 'actions' | 'ariaLabel'> & {
  triggerRef?: RefObject<ComponentRef<'button'> | null>;
}) {
  return (
    <MenuPopover placement="bottom end">
      <Menu aria-label={`${ariaLabel} actions`}>
        {actions.map(action => (
          <MenuItem
            key={action.id}
            id={action.id}
            onAction={() => action.onSelect(triggerRef?.current ?? undefined)}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </MenuPopover>
  );
}

/** Reuse the item's anchored menu for pointer and keyboard context requests. */
export function explorationMenuEvents(
  trigger: RefObject<HTMLButtonElement | null>
) {
  function open(event: { preventDefault: () => void }) {
    if (!trigger.current) return;
    event.preventDefault();
    trigger.current.click();
  }
  return {
    onContextMenu: open,
    onKeyDown(event: KeyboardEvent<Element>) {
      if (
        event.key === 'ContextMenu' ||
        (event.shiftKey && event.key === 'F10')
      )
        open(event);
    },
  };
}

/** The direct action for an item, when the action declaration supplies one. */
export function getPrimaryExplorationAction(
  actions: readonly ExplorationAction[]
): ExplorationAction | undefined {
  return actions.length === 1
    ? actions[0]
    : actions.find(action => action.primary);
}

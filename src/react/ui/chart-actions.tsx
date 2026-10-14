import { useRef, useState, type MouseEvent } from 'react';
import type { BoundExplorationActions } from '@/src/react/action-controls';
import type { ChartItem } from '@/src/react/ui/chart-data';
import { MenuPopover, Menu, MenuItem } from '@/src/react/ui/Menu';

type ActionOptions<Item> = {
  itemActions?: BoundExplorationActions<Item>;
  onItemAction?: (item: Item, trigger: HTMLElement) => void;
  actionLabel?: string;
};

/** Shared activation, menu ownership, and focus recovery for item-based charts. */
export function useChartItemActions<Item extends ChartItem>({
  itemActions,
  onItemAction,
  actionLabel,
}: ActionOptions<Item>) {
  const actionChosen = useRef(false);
  const [selection, setSelection] = useState<{
    item: Item;
    actions: BoundExplorationActions<Item>;
    triggerRef: { current: HTMLElement };
    anchorRef: { current: HTMLElement };
  } | null>(null);
  function openMenu(item: Item, trigger: HTMLElement, anchor = trigger) {
    if (!itemActions) return;
    actionChosen.current = false;
    setSelection({
      item,
      actions: itemActions,
      triggerRef: { current: trigger },
      anchorRef: { current: anchor },
    });
  }
  function closeMenu() {
    if (!selection) return;
    const trigger = selection.triggerRef.current;
    setSelection(null);
    requestAnimationFrame(() => {
      if (!actionChosen.current) trigger.focus({ preventScroll: true });
    });
  }
  return {
    triggerProps(item: Item, description: string, anchorSelector?: string) {
      const primary = itemActions?.primary(item);
      const available = !!onItemAction || !!itemActions?.items(item).length;
      const menu = available && !!itemActions && !primary;
      return {
        tabIndex: available ? 0 : -1,
        'aria-label': `${available ? `${primary?.label ?? actionLabel ?? 'Explore'}: ` : ''}${description}`,
        'aria-haspopup': menu ? ('menu' as const) : undefined,
        'aria-expanded': menu ? selection?.item.id === item.id : undefined,
        onClick(event: MouseEvent<HTMLButtonElement>) {
          if (primary) itemActions!.run(primary.id, item, event.currentTarget);
          else if (menu)
            openMenu(
              item,
              event.currentTarget,
              anchorSelector
                ? (event.currentTarget.querySelector<HTMLElement>(
                    anchorSelector
                  ) ?? event.currentTarget)
                : event.currentTarget
            );
          else onItemAction?.(item, event.currentTarget);
        },
      };
    },
    moreProps(item: Item) {
      if (!itemActions?.primary(item) || itemActions.items(item).length < 2)
        return undefined;
      return {
        'aria-label': `${item.label} actions`,
        'aria-haspopup': 'menu' as const,
        onClick: (event: MouseEvent<HTMLButtonElement>) =>
          openMenu(item, event.currentTarget),
      };
    },
    menu: selection && (
      <MenuPopover
        trigger="MenuTrigger"
        triggerRef={selection.anchorRef}
        placement="bottom"
        isOpen
        onOpenChange={open => {
          if (!open) closeMenu();
        }}
      >
        <Menu
          aria-label={`${selection.item.label} actions`}
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- Activated menus take keyboard focus.
          autoFocus="first"
          onClose={closeMenu}
          onAction={id => {
            actionChosen.current = true;
            setSelection(null);
            selection.actions.run(
              String(id),
              selection.item,
              selection.triggerRef.current
            );
          }}
        >
          {selection.actions.items(selection.item).map(item => (
            <MenuItem key={item.id} id={item.id}>
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </MenuPopover>
    ),
  };
}

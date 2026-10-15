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
  useContext,
  useLayoutEffect,
  useState,
  type ComponentRef,
  type RefObject,
  type Ref,
  type KeyboardEvent,
} from 'react';
import { useMergeRefs } from '@floating-ui/react';
import { AppIcon } from '@/src/react/ui/icons';
import { RootMenuTriggerStateContext } from 'react-aria-components';

const contextPoints = new WeakMap<
  HTMLButtonElement,
  { x: number; y: number }
>();

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
  /** Inline actions sit beside a label; stacked actions disclose choices below it. */
  layout?: 'inline' | 'stacked';
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
  layout = 'inline',
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
            className="altertable-exploration-action-trigger"
            aria-label={`${ariaLabel}: more actions`}
          >
            <AppIcon
              name={layout === 'stacked' ? 'disclosure' : 'moreActions'}
            />
          </MenuButton>
          <ExplorationActionMenu
            actions={menuActions}
            ariaLabel={ariaLabel}
            triggerRef={menuTrigger}
            placement={layout === 'stacked' ? 'bottom' : 'bottom start'}
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
  placement = 'bottom end',
}: Pick<ExplorationActionControlProps, 'actions' | 'ariaLabel'> & {
  triggerRef?: RefObject<ComponentRef<'button'> | null>;
  placement?: 'bottom' | 'bottom start' | 'bottom end';
}) {
  const state = useContext(RootMenuTriggerStateContext);
  const anchor = useRef<HTMLSpanElement>(null);
  const [point, setPoint] = useState<{ x: number; y: number }>();
  useLayoutEffect(() => {
    const trigger = triggerRef?.current;
    setPoint(state?.isOpen && trigger ? contextPoints.get(trigger) : undefined);
    if (!state?.isOpen && trigger) contextPoints.delete(trigger);
  }, [state?.isOpen, triggerRef]);
  return (
    <>
      {point && (
        <span
          ref={anchor}
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: point.x,
            top: point.y,
            width: 0,
            height: 0,
          }}
        />
      )}
      <MenuPopover
        placement={point ? 'bottom start' : placement}
        triggerRef={point ? anchor : triggerRef}
        offset={point ? 2 : undefined}
      >
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
    </>
  );
}

/** Reuse the item's menu for pointer and keyboard context requests. */
export function explorationMenuEvents(
  trigger: RefObject<HTMLButtonElement | null>
) {
  function open(
    event: { preventDefault: () => void },
    point?: { x: number; y: number }
  ) {
    if (!trigger.current) return;
    event.preventDefault();
    if (point) contextPoints.set(trigger.current, point);
    else contextPoints.delete(trigger.current);
    trigger.current.click();
  }
  return {
    onContextMenu: (event: {
      preventDefault: () => void;
      clientX: number;
      clientY: number;
    }) => {
      open(event, { x: event.clientX, y: event.clientY });
    },
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

import { useMergeRefs } from '@floating-ui/react';
import {
  useRef,
  useContext,
  useLayoutEffect,
  useState,
  Fragment,
  type ComponentRef,
  type RefObject,
  type Ref,
  type KeyboardEvent,
} from 'react';
import { RootMenuTriggerStateContext } from 'react-aria-components';

import { Button } from './Button.tsx';
import { classNames } from './classNames.ts';
import { AppIcon } from './icons.ts';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuPopover,
  MenuTrigger,
  MenuSeparator,
} from './Menu.tsx';

const contextPoints = new WeakMap<
  HTMLButtonElement,
  { x: number; y: number }
>();
const contextOrigins = new WeakMap<
  HTMLButtonElement,
  HTMLElement | SVGElement
>();

/** A resolved action available for one displayed exploration item. */
export type ExplorationAction = {
  id: string;
  label: string;
  onSelect: (trigger?: HTMLElement | SVGElement) => void;
  /** Keep this action directly available when other actions require a menu. */
  primary?: boolean;
  /** Keep utility actions separate from exploration destinations. */
  group?: 'clipboard';
};

/** Resolves the actions available for a displayed domain row. */
export type ItemActions<Row> = (row: Row) => readonly ExplorationAction[];

export type ExplorationActionControlProps = {
  actions: readonly ExplorationAction[];
  /** Identifies the item whose actions the control exposes. */
  ariaLabel: string;
  /** Use when another item-level hit target already exposes the primary action. */
  hidePrimary?: boolean;
  /** Own a context menu without adding a second visible or keyboard trigger. */
  contextOnly?: boolean;
  /** Chart labels use a chevron; other action menus use an ellipsis. */
  indicator?: 'ellipsis' | 'chevron';
  /** Shares this menu trigger with an item's context and keyboard actions. */
  ref?: Ref<HTMLButtonElement>;
  className?: string;
};

/**
 * Presents exploration actions consistently: a sole action is direct, an explicit
 * primary action stays direct, and all available choices remain in the menu.
 */
export function ExplorationActionControl({
  actions,
  ariaLabel,
  className,
  hidePrimary = false,
  contextOnly = false,
  indicator = 'ellipsis',
  ref,
}: ExplorationActionControlProps) {
  const menuTrigger = useRef<ComponentRef<'button'> | null>(null);
  const mergedTrigger = useMergeRefs([menuTrigger, ref]);
  const primary = getPrimaryExplorationAction(actions);
  const hiddenMenuTrigger = contextOnly || actions.length === 1;

  if (actions.length === 0) return null;

  return (
    <span
      className={classNames('altertable-exploration-actions', className)}
      data-context-only={
        contextOnly || (hidePrimary && actions.length === 1) || undefined
      }
    >
      {primary && !hidePrimary && !contextOnly && (
        <Button
          variant="inline"
          onClick={event => primary.onSelect(event.currentTarget)}
          aria-label={`${ariaLabel}: ${primary.label}`}
        >
          {primary.label}
        </Button>
      )}
      {actions.length > 0 && (
        <span aria-hidden={hiddenMenuTrigger || undefined}>
          <MenuTrigger>
            <MenuButton
              ref={mergedTrigger}
              variant="ghost"
              size="icon-compact"
              className="altertable-exploration-action-trigger"
              onContextMenu={event =>
                explorationMenuEvents(menuTrigger).onContextMenu(event)
              }
              onKeyDown={event =>
                explorationMenuEvents(menuTrigger).onKeyDown(event)
              }
              data-context-only={hiddenMenuTrigger || undefined}
              excludeFromTabOrder={hiddenMenuTrigger}
              aria-hidden={hiddenMenuTrigger || undefined}
              preventFocusOnPress={hiddenMenuTrigger}
              aria-label={`${ariaLabel}: more actions`}
            >
              <AppIcon
                name={indicator === 'chevron' ? 'disclosure' : 'moreActions'}
              />
            </MenuButton>
            <ExplorationActionMenu
              actions={actions}
              ariaLabel={ariaLabel}
              triggerRef={menuTrigger}
              placement={indicator === 'chevron' ? 'bottom' : 'bottom start'}
            />
          </MenuTrigger>
        </span>
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
    if (!state?.isOpen && trigger) {
      contextPoints.delete(trigger);
      contextOrigins.delete(trigger);
    }
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
        className="altertable-exploration-action-menu"
        placement={point ? 'bottom start' : placement}
        triggerRef={point ? anchor : triggerRef}
        offset={point ? 2 : undefined}
      >
        <Menu aria-label={`${ariaLabel} actions`}>
          {actions.map((action, index) => (
            <Fragment key={action.id}>
              {action.group === 'clipboard' &&
                actions[index - 1]?.group !== 'clipboard' &&
                index > 0 && <MenuSeparator />}
              <MenuItem
                id={action.id}
                onAction={() => {
                  const trigger = triggerRef?.current;
                  action.onSelect(
                    trigger
                      ? (contextOrigins.get(trigger) ?? trigger)
                      : undefined
                  );
                }}
              >
                {action.label}
              </MenuItem>
            </Fragment>
          ))}
        </Menu>
      </MenuPopover>
    </>
  );
}

/** Adds clipboard utilities derived only from the displayed chart item. */
export function useChartActions() {
  const [error, setError] = useState('');
  async function copy(text: string) {
    setError('');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError('Couldn’t copy. Try again.');
    }
  }
  return {
    actions(
      declared: readonly ExplorationAction[],
      label: string,
      summary: string
    ): readonly ExplorationAction[] {
      if (!declared.length) return declared;
      const primary = getPrimaryExplorationAction(declared);
      return [
        ...declared.map(action => ({ ...action, primary: action === primary })),
        {
          id: '$copy-label',
          label: `Copy “${label}”`,
          group: 'clipboard',
          onSelect: () => void copy(label),
        },
        {
          id: '$copy-details',
          label: 'Copy summary',
          group: 'clipboard',
          onSelect: () => void copy(`${label}\n${summary}`),
        },
      ];
    },
    feedback: error ? (
      <output className="altertable-chart-copy-status">{error}</output>
    ) : null,
  };
}

export function openExplorationMenu(
  trigger: RefObject<HTMLButtonElement | null>,
  event: { preventDefault: () => void; currentTarget?: EventTarget | null },
  point?: { x: number; y: number }
) {
  if (!trigger.current) return;
  event.preventDefault();
  if (
    event.currentTarget instanceof HTMLElement ||
    event.currentTarget instanceof SVGElement
  )
    contextOrigins.set(trigger.current, event.currentTarget);
  if (point) contextPoints.set(trigger.current, point);
  else contextPoints.delete(trigger.current);
  trigger.current.click();
}

/** Reuse the item's menu for pointer and keyboard context requests. */
export function explorationMenuEvents(
  trigger: RefObject<HTMLButtonElement | null>
) {
  return {
    onContextMenu: (event: {
      preventDefault: () => void;
      clientX: number;
      clientY: number;
    }) => {
      openExplorationMenu(trigger, event, {
        x: event.clientX,
        y: event.clientY,
      });
    },
    onKeyDown(event: KeyboardEvent<Element>) {
      if (
        event.key === 'ContextMenu' ||
        (event.shiftKey && event.key === 'F10')
      ) {
        const bounds = trigger.current?.hasAttribute('data-context-only')
          ? event.currentTarget.getBoundingClientRect()
          : undefined;
        openExplorationMenu(
          trigger,
          event,
          bounds ? { x: bounds.left, y: bounds.bottom } : undefined
        );
      }
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

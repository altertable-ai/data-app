import { Button } from '@/src/react/ui/Button';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuPopover,
  MenuTrigger,
} from '@/src/react/ui/Menu';

/** A resolved action available for one displayed exploration item. */
export type ExplorationAction = {
  id: string;
  label: string;
  onSelect: () => void;
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
}: ExplorationActionControlProps) {
  const primary = getPrimaryExplorationAction(actions);
  const menuActions = primary
    ? actions.filter(action => action !== primary)
    : actions;

  if (actions.length === 0) return null;

  return (
    <span className={className}>
      {primary && !hidePrimary && (
        <Button
          onClick={primary.onSelect}
          aria-label={`${ariaLabel}: ${primary.label}`}
        >
          {primary.label}
        </Button>
      )}
      {menuActions.length > 0 && (
        <MenuTrigger>
          <MenuButton aria-label={`${ariaLabel}: more actions`}>
            More actions
          </MenuButton>
          <ExplorationActionMenu actions={menuActions} ariaLabel={ariaLabel} />
        </MenuTrigger>
      )}
    </span>
  );
}

/** Menu content for an item-level trigger composed by a chart or custom control. */
export function ExplorationActionMenu({
  actions,
  ariaLabel,
}: Pick<ExplorationActionControlProps, 'actions' | 'ariaLabel'>) {
  return (
    <MenuPopover>
      <Menu aria-label={`${ariaLabel} actions`}>
        {actions.map(action => (
          <MenuItem key={action.id} id={action.id} onAction={action.onSelect}>
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </MenuPopover>
  );
}

/** The direct action for an item, when the action declaration supplies one. */
export function getPrimaryExplorationAction(
  actions: readonly ExplorationAction[]
): ExplorationAction | undefined {
  return actions.length === 1
    ? actions[0]
    : actions.find(action => action.primary);
}

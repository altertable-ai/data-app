import { Children, useId, useRef, useState, type ReactNode } from 'react';
import { Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { Button, PressButton } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { FilterActions } from '@/src/react/ui/FilterActions';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { Stack } from '@/src/react/ui/Stack';
import { Tooltip } from '@/src/react/ui/Tooltip';

export type ControlGroup = {
  primary: ReactNode[];
  secondary: ReactNode[];
  activeCount: number;
  activeSecondaryCount: number;
};

export function ViewFilterControls({
  groups,
  onClear,
}: {
  groups: Record<'scope' | 'display', ControlGroup>;
  onClear?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const secondaryId = useId();
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const hasScope =
    groups.scope.primary.length + groups.scope.secondary.length > 0;
  const hasDisplay =
    groups.display.primary.length + groups.display.secondary.length > 0;
  const filterLabel = groups.scope.activeSecondaryCount
    ? `More filters (${groups.scope.activeSecondaryCount} active)`
    : 'More filters';
  return (
    <Stack gap="sm">
      <VariableBar
        aria-label={hasScope || !hasDisplay ? 'Filters' : 'View options'}
      >
        {groups.scope.primary}
        {!!groups.scope.secondary.length && (
          <Tooltip
            content={
              expanded ? 'Hide additional filters' : 'Show additional filters'
            }
          >
            <Button
              ref={filterToggleRef}
              aria-label={filterLabel}
              aria-expanded={expanded}
              aria-controls={secondaryId}
              data-open={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              More filters
              {groups.scope.activeSecondaryCount > 0 && (
                <span className="altertable-control-count" aria-hidden="true">
                  {groups.scope.activeSecondaryCount}
                </span>
              )}
              <AppIcon
                name="disclosure"
                size={14}
                className="altertable-filter-disclosure"
              />
            </Button>
          </Tooltip>
        )}
        {onClear && (
          <FilterActions
            onClear={() => {
              onClear();
              setExpanded(false);
              filterToggleRef.current?.focus();
            }}
          />
        )}
        {hasDisplay && <DisplayOptionsPopover controls={groups.display} />}
      </VariableBar>
      {!!groups.scope.secondary.length && (
        <div id={secondaryId} hidden={!expanded}>
          {expanded && (
            <VariableBar
              aria-label="Secondary filters"
              className="altertable-secondary-controls"
            >
              {groups.scope.secondary}
            </VariableBar>
          )}
        </div>
      )}
    </Stack>
  );
}

function DisplayOptionsPopover({ controls }: { controls: ControlGroup }) {
  const [open, setOpen] = useState(false);
  const label = controls.activeCount
    ? `Display options (${controls.activeCount} changed)`
    : 'Display options';
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Tooltip content={label} className="altertable-display-options-trigger">
        <PressButton
          size="icon"
          aria-label={label}
          data-open={open}
          className="altertable-display-options-button"
        >
          <AppIcon name="displayOptions" />
          {controls.activeCount > 0 && (
            <span className="altertable-control-indicator" aria-hidden="true" />
          )}
        </PressButton>
      </Tooltip>
      <Popover
        className="altertable-display-options-popover"
        placement="bottom end"
      >
        <Dialog
          aria-label="Display options"
          className="altertable-display-options-dialog"
        >
          {controls.primary.length > 0 && (
            <div className="altertable-display-options-section">
              {Children.map(controls.primary, control => (
                <div className="altertable-display-option">{control}</div>
              ))}
            </div>
          )}
          {controls.secondary.length > 0 && (
            <div className="altertable-display-options-section">
              {Children.map(controls.secondary, control => (
                <div className="altertable-display-option">{control}</div>
              ))}
            </div>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

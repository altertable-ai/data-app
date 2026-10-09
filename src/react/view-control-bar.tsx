import {
  Children,
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { Button, PressButton } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { FilterActions } from '@/src/react/ui/FilterActions';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { Stack } from '@/src/react/ui/Stack';
import { Tooltip } from '@/src/react/ui/Tooltip';

/** The page layout owns focus outside the control bar. */
export const ViewControlFocusContext = createContext<(() => void) | null>(null);

export function ViewControlBar({
  primaryFilters,
  secondaryFilters,
  activeSecondaryFilterCount,
  displayOptions,
  changedDisplayOptionCount,
  onClear,
}: {
  primaryFilters: ReactNode[];
  secondaryFilters: ReactNode[];
  activeSecondaryFilterCount: number;
  displayOptions: ReactNode[];
  changedDisplayOptionCount: number;
  onClear?: () => void;
}) {
  const focusFallback = useContext(ViewControlFocusContext);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const secondaryFiltersId = useId();
  const moreFiltersRef = useRef<ComponentRef<'button'>>(null);
  const primaryControlsRef = useRef<ComponentRef<typeof VariableBar>>(null);
  const hasSecondaryFilters = secondaryFilters.length > 0;
  const moreFiltersLabel = activeSecondaryFilterCount
    ? `More filters (${activeSecondaryFilterCount} active)`
    : 'More filters';

  function clearFilters() {
    const controls = primaryControlsRef.current;
    const focusTarget =
      moreFiltersRef.current ??
      controls?.querySelector<HTMLElement>(
        ':is(button[aria-haspopup], button[aria-expanded], input, select):not(:disabled):not([aria-disabled="true"])'
      );
    onClear?.();
    setFiltersExpanded(false);
    if (focusTarget) focusTarget.focus();
    else focusFallback?.();
  }

  return (
    <Stack gap="sm">
      <VariableBar
        ref={primaryControlsRef}
        className="altertable-primary-controls"
        aria-label="View controls"
      >
        {primaryFilters}
        {hasSecondaryFilters && (
          <Tooltip
            content={
              filtersExpanded
                ? 'Hide additional filters'
                : 'Show additional filters'
            }
          >
            <Button
              variant="ghost"
              ref={moreFiltersRef}
              aria-label={moreFiltersLabel}
              aria-expanded={filtersExpanded}
              aria-controls={secondaryFiltersId}
              data-open={filtersExpanded}
              onClick={() => setFiltersExpanded(current => !current)}
            >
              More filters
              {activeSecondaryFilterCount > 0 && (
                <span className="altertable-control-count" aria-hidden="true">
                  {activeSecondaryFilterCount}
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
        {onClear && <FilterActions onClear={clearFilters} />}
        {displayOptions.length > 0 && (
          <DisplayOptionsPopover changedCount={changedDisplayOptionCount}>
            {displayOptions}
          </DisplayOptionsPopover>
        )}
      </VariableBar>
      {hasSecondaryFilters && (
        <div id={secondaryFiltersId} hidden={!filtersExpanded}>
          {filtersExpanded && (
            <VariableBar
              aria-label="Secondary filters"
              className="altertable-secondary-controls"
            >
              {secondaryFilters}
            </VariableBar>
          )}
        </div>
      )}
    </Stack>
  );
}

function DisplayOptionsPopover({
  children,
  changedCount,
}: {
  children: ReactNode;
  changedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const label = changedCount
    ? `Display options (${changedCount} changed)`
    : 'Display options';
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Tooltip content={label} className="altertable-display-options-trigger">
        <PressButton
          variant="ghost"
          size="icon"
          aria-label={label}
          data-open={open}
          className="altertable-display-options-button"
        >
          <AppIcon name="displayOptions" />
          {changedCount > 0 && (
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
          {Children.map(children, control => (
            <div className="altertable-display-option">{control}</div>
          ))}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

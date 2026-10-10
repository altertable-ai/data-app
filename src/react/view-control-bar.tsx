import { PopoverSurface } from '@/src/react/ui/PopoverSurface';
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
import { Dialog, DialogTrigger } from 'react-aria-components';
import { Button, PressButton } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { FilterActions } from '@/src/react/ui/FilterActions';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { Sheet } from '@/src/react/ui/Sheet';
import { Kbd } from '@/src/react/ui/Kbd';
import {
  shortcuts,
  ariaKeyShortcuts,
  useShortcut,
} from '@/src/react/ui/shortcuts';
import { Tooltip } from '@/src/react/ui/Tooltip';

/** The page layout owns focus outside the control bar. */
export const ViewControlFocusContext = createContext<(() => void) | null>(null);

export function ViewControlBar({
  primaryFilters,
  sheetFilters,
  hasSecondaryFilters,
  activeSecondaryFilterCount,
  displayOptions,
  changedDisplayOptionCount,
  onClear,
}: {
  primaryFilters: ReactNode[];
  sheetFilters: ReactNode[];
  hasSecondaryFilters: boolean;
  activeSecondaryFilterCount: number;
  displayOptions: ReactNode[];
  changedDisplayOptionCount: number;
  onClear?: () => void;
}) {
  const focusFallback = useContext(ViewControlFocusContext);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const moreFiltersRef = useRef<ComponentRef<'button'>>(null);
  const primaryControlsRef = useRef<ComponentRef<typeof VariableBar>>(null);
  const moreFiltersLabel = activeSecondaryFilterCount
    ? `More filters (${activeSecondaryFilterCount} active)`
    : 'More filters';

  useShortcut(
    shortcuts.filters,
    () => setFiltersOpen(true),
    hasSecondaryFilters
  );

  function clearFilters() {
    const controls = primaryControlsRef.current;
    const focusTarget =
      moreFiltersRef.current ??
      controls?.querySelector<HTMLElement>(
        ':is(button[aria-haspopup], button[aria-expanded], input, select):not(:disabled):not([aria-disabled="true"])'
      );
    onClear?.();
    setFiltersOpen(false);
    if (focusTarget) focusTarget.focus();
    else focusFallback?.();
  }

  return (
    <>
      <VariableBar
        ref={primaryControlsRef}
        className="altertable-primary-controls"
        aria-label="View controls"
      >
        <div className="altertable-filter-bar-inputs">
          {primaryFilters}
          {hasSecondaryFilters && (
            <Tooltip
              content={
                <>
                  Filters <Kbd shortcut={shortcuts.filters} />
                </>
              }
            >
              <Button
                variant="ghost"
                ref={moreFiltersRef}
                aria-label={moreFiltersLabel}
                aria-haspopup="dialog"
                aria-keyshortcuts={ariaKeyShortcuts(shortcuts.filters)}
                aria-expanded={filtersOpen}
                aria-controls={filtersId}
                data-open={filtersOpen}
                onClick={() => setFiltersOpen(current => !current)}
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
        </div>
        {displayOptions.length > 0 && (
          <DisplayOptionsPopover changedCount={changedDisplayOptionCount}>
            {displayOptions}
          </DisplayOptionsPopover>
        )}
      </VariableBar>
      {hasSecondaryFilters && (
        <Sheet
          id={filtersId}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          returnFocus={moreFiltersRef}
          title="Filters"
          className="altertable-filter-sheet"
          description="Choose filters to narrow the results."
          footer={
            <div className="altertable-filter-sheet-actions">
              <Tooltip content="Clear all filters">
                <Button
                  variant="ghost"
                  disabled={!onClear}
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              </Tooltip>
              <Button variant="primary" onClick={() => setFiltersOpen(false)}>
                Show results
              </Button>
            </div>
          }
        >
          <VariableBar
            aria-label="All filters"
            className="altertable-sheet-filters"
          >
            {sheetFilters}
          </VariableBar>
        </Sheet>
      )}
    </>
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
      <PopoverSurface
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
      </PopoverSurface>
    </DialogTrigger>
  );
}

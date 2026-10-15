import { GradientScroll } from '@/src/react/ui/GradientScroll';
import { PopoverSurface } from '@/src/react/ui/PopoverSurface';
import {
  Children,
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
import { Tooltip } from '@/src/react/ui/Tooltip';

export type ActiveFilterControl = {
  id: string;
  label: string;
  summary: string;
};

export function ViewControlBar({
  primaryFilters,
  activeSecondaryFilters,
  allFilters,
  activeFilterCount,
  displayOptions,
  changedDisplayOptionCount,
  onClear,
}: {
  primaryFilters: ReactNode[];
  allFilters: ReactNode[];
  activeSecondaryFilters: ActiveFilterControl[];
  activeFilterCount: number;
  displayOptions: ReactNode[];
  changedDisplayOptionCount: number;
  onClear?: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const filtersButtonRef = useRef<ComponentRef<'button'>>(null);
  const filtersButtonLabel = activeFilterCount
    ? `Filters (${activeFilterCount} active)`
    : 'Filters';

  function clearFilters() {
    onClear?.();
    setFiltersOpen(false);
    filtersButtonRef.current?.focus();
  }

  return (
    <>
      <VariableBar
        className="altertable-primary-controls"
        aria-label="View controls"
      >
        <div className="altertable-filter-bar-inputs">
          {allFilters.length > 0 && (
            <Button
              ref={filtersButtonRef}
              aria-label={filtersButtonLabel}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              data-open={filtersOpen}
              onClick={() => setFiltersOpen(true)}
            >
              <AppIcon name="filters" />
              Filters
              {activeFilterCount > 0 && (
                <span className="altertable-control-count" aria-hidden="true">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}
          {primaryFilters}
          {onClear && <FilterActions onClear={clearFilters} />}
        </div>
        {displayOptions.length > 0 && (
          <DisplayOptionsPopover changedCount={changedDisplayOptionCount}>
            {displayOptions}
          </DisplayOptionsPopover>
        )}
        {onClear && (
          <fieldset
            className="altertable-active-filters"
            aria-label="Active filters"
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open filters"
              onClick={() => setFiltersOpen(true)}
            >
              <AppIcon name="filters" />
            </Button>
            <GradientScroll
              axis="horizontal"
              className="altertable-filter-summaries"
            >
              {activeSecondaryFilters.map(filter => (
                <Button
                  key={filter.id}
                  variant="ghost"
                  aria-label={`Open filters: ${filter.label}: ${filter.summary}`}
                  onClick={() => setFiltersOpen(true)}
                >
                  <span className="altertable-picker-label">
                    {filter.label}
                  </span>
                  <span>{filter.summary}</span>
                </Button>
              ))}
            </GradientScroll>
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          </fieldset>
        )}
      </VariableBar>
      {allFilters.length > 0 && (
        <Sheet
          id={filtersId}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          returnFocus={filtersButtonRef}
          title="Filters"
          side="left"
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
                Done
              </Button>
            </div>
          }
        >
          <VariableBar
            aria-label="All filters"
            className="altertable-sheet-filters"
          >
            {allFilters}
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
    ? `Display options, ${changedCount} changed`
    : 'Display options';
  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Tooltip
        content={
          <span className="altertable-display-options-label">
            Display options
            {changedCount > 0 && <small>{changedCount} changed</small>}
          </span>
        }
        className="altertable-display-options-trigger"
      >
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

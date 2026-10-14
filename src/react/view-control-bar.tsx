import { GradientScroll } from '@/src/react/ui/GradientScroll';
import { PopoverSurface } from '@/src/react/ui/PopoverSurface';
import {
  Children,
  useId,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type MouseEventHandler,
} from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { Button, PressButton } from '@/src/react/ui/Button';
import { AppIcon } from '@/src/react/ui/icons';
import { VariableBar } from '@/src/react/ui/VariableBar';
import { Sheet } from '@/src/react/ui/Sheet';
import { Tooltip } from '@/src/react/ui/Tooltip';

export type FilterSummary = (
  onEdit: MouseEventHandler<HTMLButtonElement>
) => ReactNode;

export function ViewControlBar({
  primaryFilters,
  filterSummaries,
  groupingSummaries,
  allFilters,
  activeFilterCount,
  displayOptions,
  changedDisplayOptionCount,
  onClear,
}: {
  primaryFilters: ReactNode[];
  allFilters: ReactNode[];
  filterSummaries: FilterSummary[];
  groupingSummaries: FilterSummary[];
  activeFilterCount: number;
  displayOptions: ReactNode[];
  changedDisplayOptionCount: number;
  onClear?: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const filtersButtonRef = useRef<ComponentRef<'button'>>(null);
  const returnFocus = useRef<HTMLButtonElement>(null);
  function openFilters(trigger: HTMLButtonElement) {
    returnFocus.current = trigger;
    setFiltersOpen(true);
  }
  const filtersButtonLabel = activeFilterCount
    ? `Filters (${activeFilterCount} active)`
    : 'Filters';

  function clearFilters() {
    returnFocus.current = filtersButtonRef.current;
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
              data-view-filters-trigger
              aria-label={filtersButtonLabel}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              data-open={filtersOpen}
              onClick={event => openFilters(event.currentTarget)}
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
        </div>
        {displayOptions.length > 0 && (
          <DisplayOptionsPopover changedCount={changedDisplayOptionCount}>
            {displayOptions}
          </DisplayOptionsPopover>
        )}
      </VariableBar>
      {(filterSummaries.length > 0 || groupingSummaries.length > 0) && (
        <fieldset className="altertable-filter-summary" aria-label="View scope">
          <AppIcon name="filters" />
          <GradientScroll
            axis="horizontal"
            className="altertable-filter-summary-items"
          >
            {filterSummaries.length > 0 && (
              <span className="altertable-filter-summary-label">
                Filtered by
              </span>
            )}
            {
              // oxlint-disable-next-line react/refs -- Summary renderers attach the callback to buttons; they never invoke it during render.
              filterSummaries.map(render =>
                render(event => openFilters(event.currentTarget))
              )
            }
            {groupingSummaries.length > 0 && (
              <div
                className="altertable-grouping-summary"
                data-separated={filterSummaries.length > 0 || undefined}
              >
                {
                  // oxlint-disable-next-line react/refs -- Summary renderers attach this handler to buttons.
                  groupingSummaries.map(render =>
                    render(event => openFilters(event.currentTarget))
                  )
                }
              </div>
            )}
          </GradientScroll>
          {filterSummaries.length > 0 && (
            <Button variant="ghost" disabled={!onClear} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </fieldset>
      )}
      {allFilters.length > 0 && (
        <Sheet
          id={filtersId}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          returnFocus={returnFocus}
          title="Filters"
          side="left"
          className="altertable-filter-sheet"
          description={
            groupingSummaries.length
              ? 'Filter results and choose how to group them.'
              : 'Choose filters to narrow the results.'
          }
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

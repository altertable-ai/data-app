import { PopoverSurface } from '@/src/react/ui/PopoverSurface';
import {
  Children,
  useId,
  useEffect,
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

export type FilterControl = { id: string; label: string; control: ReactNode };
export type ActiveFilterSummary = {
  id: string;
  label: string;
  value: string;
  fullValue: string;
  onClear?: () => void;
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
  allFilters: FilterControl[];
  activeSecondaryFilters: ActiveFilterSummary[];
  activeFilterCount: number;
  displayOptions: ReactNode[];
  changedDisplayOptionCount: number;
  onClear?: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const filterFields = useRef(new Map<string, ComponentRef<'fieldset'>>());
  useEffect(() => {
    if (!filtersOpen || !selectedFilterId) return;
    const frame = requestAnimationFrame(() => {
      const field = filterFields.current.get(selectedFilterId);
      field?.scrollIntoView({ block: 'nearest' });
      field?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [filtersOpen, selectedFilterId]);
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
              onClick={() => {
                setSelectedFilterId(null);
                setFiltersOpen(true);
              }}
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
        {activeSecondaryFilters.length > 0 && (
          <fieldset
            className="altertable-active-filters"
            aria-label="Active filters"
          >
            {activeSecondaryFilters.map(filter => (
              <div className="altertable-active-filter" key={filter.id}>
                <Tooltip content={`${filter.label}: ${filter.fullValue}`}>
                  <Button
                    variant="ghost"
                    className="altertable-active-filter-label"
                    aria-label={`Edit ${filter.label}: ${filter.fullValue}`}
                    onClick={() => {
                      setSelectedFilterId(filter.id);
                      setFiltersOpen(true);
                    }}
                  >
                    <span>
                      {filter.label}: {filter.value}
                    </span>
                  </Button>
                </Tooltip>
                {filter.onClear && (
                  <Tooltip content={`Clear ${filter.label}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Clear ${filter.label}`}
                      onClick={() => {
                        filter.onClear?.();
                        filtersButtonRef.current?.focus();
                      }}
                    >
                      <AppIcon name="close" size={14} />
                    </Button>
                  </Tooltip>
                )}
              </div>
            ))}
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
                Show results
              </Button>
            </div>
          }
        >
          <VariableBar
            aria-label="All filters"
            className="altertable-sheet-filters"
          >
            {allFilters.map(filter => (
              <fieldset
                key={filter.id}
                aria-label={filter.label}
                tabIndex={-1}
                className="altertable-sheet-filter"
                data-atbl-focus="ring"
                ref={element => {
                  if (element) filterFields.current.set(filter.id, element);
                  else filterFields.current.delete(filter.id);
                }}
              >
                {filter.control}
              </fieldset>
            ))}
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

import { GradientScroll } from '@/src/react/ui/GradientScroll';
import { ControlLabelValue } from '@/src/react/ui/PickerField';
import { PopoverSurface } from '@/src/react/ui/PopoverSurface';
import {
  Children,
  useEffect,
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
  onRemove: () => void;
  /** Render the editor and notify when it clears its own active filter. */
  renderToolbarControl?: (onClear: () => void) => ReactNode;
};

export function ViewControlBar({
  primaryFilters,
  activeFilters,
  allFilters,
  activeFilterCount,
  displayOptions,
  changedDisplayOptionCount,
  onClear,
}: {
  primaryFilters: ReactNode[];
  allFilters: ReactNode[];
  activeFilters: ActiveFilterControl[];
  activeFilterCount: number;
  displayOptions: ReactNode[];
  changedDisplayOptionCount: number;
  onClear?: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toolbarAboveViewport, setToolbarAboveViewport] = useState(false);
  const toolbarRef = useRef<ComponentRef<'div'>>(null);
  const summaryRef = useRef<ComponentRef<'fieldset'>>(null);
  const sheetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filtersId = useId();
  const filtersButtonRef = useRef<ComponentRef<'button'>>(null);
  const activeFiltersButtonRef = useRef<ComponentRef<'button'>>(null);
  const filtersButtonLabel = activeFilterCount
    ? `Filters (${activeFilterCount} active)`
    : 'Filters';
  const secondaryFilters = activeFilters.filter(
    filter => filter.renderToolbarControl
  );

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      const above =
        entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0);
      if (!above && summaryRef.current?.contains(document.activeElement))
        filtersButtonRef.current?.focus({ preventScroll: true });
      setToolbarAboveViewport(above);
    });
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  function openFilters(trigger: HTMLButtonElement) {
    sheetTriggerRef.current = trigger;
    setFiltersOpen(true);
  }

  function focusFiltersButton() {
    const trigger = activeFiltersButtonRef.current ?? filtersButtonRef.current;
    if (trigger === filtersButtonRef.current)
      trigger?.scrollIntoView({ block: 'nearest' });
    trigger?.focus({ preventScroll: true });
  }

  function clearFilters() {
    onClear?.();
    sheetTriggerRef.current = null;
    setFiltersOpen(false);
    if (!filtersOpen) requestAnimationFrame(focusFiltersButton);
  }

  function removeFilter(filter: ActiveFilterControl) {
    filter.onRemove();
    requestAnimationFrame(focusFiltersButton);
  }

  return (
    <>
      <VariableBar
        ref={toolbarRef}
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
          {secondaryFilters.length > 0 && (
            <fieldset
              className="altertable-toolbar-filter-editors"
              aria-label="Active toolbar filters"
            >
              {secondaryFilters.map(filter => (
                <ActiveFilterEditor
                  key={filter.id}
                  filter={filter}
                  onClear={focusFiltersButton}
                />
              ))}
            </fieldset>
          )}
        </div>
        {(onClear || displayOptions.length > 0) && (
          <div className="altertable-primary-control-actions">
            {onClear && <FilterActions onClear={clearFilters} />}
            {displayOptions.length > 0 && (
              <DisplayOptionsPopover changedCount={changedDisplayOptionCount}>
                {displayOptions}
              </DisplayOptionsPopover>
            )}
          </div>
        )}
      </VariableBar>
      {toolbarAboveViewport && activeFilters.length > 0 && (
        <fieldset
          ref={summaryRef}
          className="altertable-active-filters"
          aria-label="Active filters"
        >
          <Button
            variant="ghost"
            size="icon"
            ref={activeFiltersButtonRef}
            aria-label="Open filters"
            onClick={event => openFilters(event.currentTarget)}
          >
            <AppIcon name="filters" />
          </Button>
          <GradientScroll
            axis="horizontal"
            className="altertable-filter-summaries"
          >
            {activeFilters.map(filter => (
              <ActiveFilterChip
                key={filter.id}
                filter={filter}
                onOpen={openFilters}
                onRemove={removeFilter}
              />
            ))}
          </GradientScroll>
          {onClear && (
            <Button
              variant="ghost"
              aria-label="Clear filters"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </fieldset>
      )}
      {allFilters.length > 0 && (
        <Sheet
          id={filtersId}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onClose={() => {
            const trigger = sheetTriggerRef.current;
            if (trigger?.isConnected && trigger.getClientRects().length)
              trigger.focus({ preventScroll: true });
            else focusFiltersButton();
          }}
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

function ActiveFilterEditor({
  filter,
  onClear,
}: {
  filter: ActiveFilterControl;
  onClear: () => void;
}) {
  return filter.renderToolbarControl?.(() => requestAnimationFrame(onClear));
}

function ActiveFilterChip({
  filter,
  onOpen,
  onRemove,
}: {
  filter: ActiveFilterControl;
  onOpen: (trigger: HTMLButtonElement) => void;
  onRemove: (filter: ActiveFilterControl) => void;
}) {
  return (
    <div className="altertable-active-filter">
      <Button
        variant="ghost"
        className="altertable-active-filter-label"
        data-atbl-focus="inset"
        aria-label={`Open filters: ${filter.label}: ${filter.summary}`}
        onClick={event => onOpen(event.currentTarget)}
      >
        <ControlLabelValue label={filter.label} value={filter.summary} />
      </Button>
      <Tooltip content={`Remove ${filter.label} filter`}>
        <Button
          variant="ghost"
          size="icon-compact"
          className="altertable-active-filter-remove"
          data-atbl-focus="inset"
          aria-label={`Remove ${filter.label} filter`}
          onClick={() => onRemove(filter)}
        >
          <AppIcon name="close" size={14} />
        </Button>
      </Tooltip>
    </div>
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

import { AppIcon } from '@/src/react/ui/icons';
import { Button } from '@/src/react/ui/Button';
import type { BoundExplorationActions } from '@/src/react/action-controls';
import { MenuPopover, Menu, MenuItem } from '@/src/react/ui/Menu';
import { chartBarFill } from '@/src/react/ui/chartColor';
import { Tooltip } from '@/src/react/ui/Tooltip';
import { useLayoutEffect, useRef, useState } from 'react';

import {
  validateChartItems,
  type ChartItem,
  type ValueChartProps,
} from '@/src/react/ui/chart-data';

import { BarChart as RechartsBarChart, Cell } from 'recharts';
import {
  ChartBar,
  ChartXAxis,
  ChartYAxis,
} from '@/src/react/ui/chart-primitives';

export type BarChartItem = ChartItem;

export type BarChartProps<Item extends BarChartItem = BarChartItem> = Omit<
  ValueChartProps,
  'items'
> & { items: readonly Item[] } & (
    | {
        onItemAction?: never;
        actionLabel?: never;
        itemActions?: BoundExplorationActions<NoInfer<Item>>;
      }
    | {
        itemActions?: never;
        onItemAction?: (item: Item, trigger: HTMLElement) => void;
        actionLabel: string;
      }
  );

/** Nonnegative category values. Compose inside VisualizationWidget for a titled panel.
 * Owns hover/touch tooltips; optional item actions use native button keyboard activation. */
export function BarChart<Item extends BarChartItem>({
  items,
  unit,
  ariaLabel,
  formatValue = value => new Intl.NumberFormat().format(value),
  onItemAction,
  actionLabel,
  itemActions,
}: BarChartProps<Item>) {
  validateChartItems('bar', items);
  const [activeId, setActiveId] = useState<string>();
  const actionChosen = useRef(false);
  const [selection, setSelection] = useState<{
    item: Item;
    actions: BoundExplorationActions<Item>;
    triggerRef: { current: HTMLElement };
    anchorRef: { current: HTMLElement };
  } | null>(null);
  function closeMenu() {
    if (!selection) return;
    const trigger = selection.triggerRef.current;
    setSelection(null);
    requestAnimationFrame(() => {
      if (!actionChosen.current) trigger.focus({ preventScroll: true });
    });
  }
  function activate(item: Item, trigger: HTMLElement) {
    if (!itemActions) {
      onItemAction?.(item, trigger);
      return;
    }
    const primary = itemActions.primary(item);
    if (primary) itemActions.run(primary.id, item, trigger);
    else if (itemActions.items(item).length) {
      actionChosen.current = false;
      setSelection({
        item,
        actions: itemActions,
        triggerRef: { current: trigger },
        anchorRef: {
          current:
            trigger.querySelector<HTMLElement>(
              '.altertable-selectable-bars-label'
            ) ?? trigger,
        },
      });
    }
  }
  const scrollport = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = scrollport.current;
    if (element) element.scrollLeft = element.scrollWidth - element.clientWidth;
  }, [items]);

  const maximum = items.reduce((max, item) => Math.max(max, item.value), 1);

  return (
    <section className="altertable-selectable-bars" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      <div className="altertable-selectable-bars-scroll" ref={scrollport}>
        <div
          className="altertable-selectable-bars-plot"
          style={{ minWidth: items.length * (itemActions ? 120 : 45) }}
        >
          <div className="altertable-chart-canvas" aria-hidden="true">
            <RechartsBarChart
              data={items.map(item => ({
                ...item,
                plotValue: item.value / maximum,
              }))}
              title={ariaLabel}
              responsive
              width="100%"
              height={220}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              accessibilityLayer={false}
              tabIndex={-1}
              barCategoryGap="24%"
            >
              <ChartXAxis hide dataKey="id" scale="band" />
              <ChartYAxis hide domain={[0, 1]} allowDataOverflow />
              <ChartBar
                dataKey="plotValue"
                minPointSize={value => ((value ?? 0) > 0 ? 7 : 0)}
              >
                {items.map(item => (
                  <Cell
                    key={item.id}
                    fill={
                      activeId === item.id
                        ? 'var(--atbl-chart-1)'
                        : chartBarFill
                    }
                  />
                ))}
              </ChartBar>
            </RechartsBarChart>
          </div>
          <div className="altertable-selectable-bars-items">
            {items.map(item => (
              <div key={item.id} className="altertable-selectable-bars-column">
                <Tooltip
                  variant="chart"
                  onOpenChange={open =>
                    setActiveId(current =>
                      open ? item.id : current === item.id ? undefined : current
                    )
                  }
                  content={
                    <>
                      <strong>{item.label}</strong>
                      <span>
                        {formatValue(item.value)} {unit}
                      </span>
                    </>
                  }
                  className="altertable-chart-column"
                >
                  <button
                    data-atbl-focus="ring"
                    data-atbl-control="default"
                    type="button"
                    tabIndex={
                      onItemAction || itemActions?.items(item).length ? 0 : -1
                    }
                    onClick={event => activate(item, event.currentTarget)}
                    aria-expanded={
                      itemActions &&
                      !itemActions.primary(item) &&
                      itemActions.items(item).length
                        ? selection?.item.id === item.id
                        : undefined
                    }
                    aria-haspopup={
                      itemActions &&
                      !itemActions.primary(item) &&
                      itemActions.items(item).length
                        ? 'menu'
                        : undefined
                    }
                    className="altertable-selectable-bars-item"
                    aria-label={`${itemActions ? `${itemActions.primary(item)?.label ?? 'Explore'}: ` : onItemAction ? `${actionLabel}: ` : ''}${item.label}: ${formatValue(item.value)} ${unit}`}
                  >
                    <span className="altertable-selectable-bars-area" />
                    <span className="altertable-selectable-bars-label">
                      {item.label}
                      {itemActions &&
                        !itemActions.primary(item) &&
                        itemActions.items(item).length > 1 && (
                          <AppIcon name="disclosure" size={14} />
                        )}
                    </span>
                  </button>
                </Tooltip>
                {itemActions?.primary(item) &&
                  itemActions.items(item).length > 1 && (
                    <Button
                      className="altertable-chart-more-actions"
                      size="compact"
                      variant="ghost"
                      aria-label={`${item.label} actions`}
                      aria-haspopup="menu"
                      onClick={event => {
                        actionChosen.current = false;
                        setSelection({
                          item,
                          actions: itemActions,
                          triggerRef: { current: event.currentTarget },
                          anchorRef: { current: event.currentTarget },
                        });
                      }}
                    >
                      More actions
                      <AppIcon name="disclosure" size={14} />
                    </Button>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {selection && (
        <MenuPopover
          trigger="MenuTrigger"
          triggerRef={selection.anchorRef}
          placement="bottom"
          isOpen
          onOpenChange={open => {
            if (!open) closeMenu();
          }}
        >
          <Menu
            aria-label={`${selection.item.label} actions`}
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- An activated menu takes keyboard focus.
            autoFocus="first"
            onClose={closeMenu}
            onAction={id => {
              actionChosen.current = true;
              const current = selection;
              setSelection(null);
              current.actions.run(
                String(id),
                current.item,
                current.triggerRef.current
              );
            }}
          >
            {selection.actions.items(selection.item).map(item => (
              <MenuItem key={item.id} id={item.id}>
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </MenuPopover>
      )}
    </section>
  );
}

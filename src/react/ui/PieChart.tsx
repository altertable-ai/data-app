import { ChartLegend } from '@/src/react/ui/ChartLegend';
import { Tooltip } from '@/src/react/ui/Tooltip';
import {
  ExplorationActionControl,
  explorationMenuEvents,
  ExplorationActionMenu,
  getPrimaryExplorationAction,
} from '@/src/react/ui/ExplorationActionControl';
import { MenuButton, MenuTrigger } from '@/src/react/ui/Menu';
import { useRef, useState, type ComponentRef, type RefObject } from 'react';
import type { ChartItem, ValueChartProps } from '@/src/react/ui/chart-data';
import { validateValueChartItems } from '@/src/react/ui/chart-data';

export type PieChartItem = ChartItem;
export type PieChartProps<Row extends PieChartItem = PieChartItem> =
  ValueChartProps<Row> & {
    /** Omit the built-in key when composing a separate ChartLegend. */
    showLegend?: boolean;
  };

/** Nonnegative, mutually exclusive parts; shares use the sum of supplied items.
 * Include Other to represent the whole. Zero values remain in the legend; all-zero
 * data shows an empty circle. Colors follow item order. Compose inside VisualizationWidget;
 * hover/touch tooltips coordinate slice and legend emphasis without caller state. */
export function PieChart<Row extends PieChartItem>({
  items,
  unit,
  ariaLabel,
  showLegend = true,
  formatValue = value => new Intl.NumberFormat().format(value),
  itemActions,
}: PieChartProps<Row>) {
  validateValueChartItems('pie', items);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [plotOpen, setPlotOpen] = useState(false);
  const [legendId, setLegendId] = useState<string | null>(null);
  const menuTriggers = useRef(new Map<string, ComponentRef<'button'>>());
  const maximum = items.reduce((max, item) => Math.max(max, item.value), 0);
  const total = maximum
    ? items.reduce((sum, item) => sum + item.value / maximum, 0)
    : 0;
  let cursor = -Math.PI / 2;
  const slices: (Row & {
    share: number;
    color: string;
    path: string;
  })[] = [];
  for (const [index, item] of items.entries()) {
    const share = total ? item.value / maximum / total : 0;
    const start = cursor;
    cursor += share * Math.PI * 2;
    const middle = (start + cursor) / 2;
    function point(angle: number) {
      return `${110 + Math.cos(angle) * 100},${110 + Math.sin(angle) * 100}`;
    }
    slices.push({
      ...item,
      share,
      color: `var(--atbl-chart-${(index % 8) + 1})`,
      path: `${share === 1 ? 'M' : 'M110,110 L'}${point(start)} A100,100 0 0 1 ${point(middle)} A100,100 0 0 1 ${point(cursor)} Z`,
    });
  }
  function percent(share: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(share);
  }
  function detail(item: (typeof slices)[number]) {
    return (
      <>
        <strong>{item.label}</strong>
        <span>
          {formatValue(item.value)} {unit} · {percent(item.share)}
        </span>
      </>
    );
  }
  const preview = slices.find(item => item.id === previewId);
  return (
    <section className="altertable-pie-chart" aria-label={ariaLabel}>
      {items.length === 0 && <span>No data</span>}
      {items.length > 0 && (
        <>
          <div className="altertable-pie-plot">
            <Tooltip
              variant="chart"
              className="altertable-pie-tooltip"
              onOpenChange={setPlotOpen}
              content={preview ? detail(preview) : null}
            >
              <svg
                viewBox="0 0 220 220"
                aria-hidden={itemActions ? undefined : true}
                aria-label={itemActions ? ariaLabel : undefined}
                focusable={itemActions ? undefined : false}
                role={itemActions ? 'group' : undefined}
              >
                {total === 0 ? (
                  <circle
                    cx="110"
                    cy="110"
                    r="100"
                    className="altertable-pie-empty"
                  />
                ) : (
                  slices
                    .filter(item => item.share > 0)
                    .map(item => {
                      const menuTrigger = {
                        get current() {
                          return menuTriggers.current.get(item.id) ?? null;
                        },
                      };
                      const action = getPrimaryExplorationAction(
                        itemActions?.(item) ?? []
                      );
                      const opensMenu =
                        !action && (itemActions?.(item).length ?? 0) > 1;
                      return (
                        <path
                          key={item.id}
                          d={item.path}
                          fill={item.color}
                          className="altertable-pie-slice"
                          data-active={
                            item.id ===
                              (plotOpen && previewId
                                ? previewId
                                : showLegend
                                  ? legendId
                                  : null) || undefined
                          }
                          onPointerDown={event => {
                            if (plotOpen && previewId !== item.id)
                              event.preventDefault();
                            setPreviewId(item.id);
                          }}
                          onClick={event => {
                            if (action) action.onSelect(event.currentTarget);
                            else if (opensMenu)
                              menuTriggers.current.get(item.id)?.click();
                          }}
                          onContextMenu={
                            explorationMenuEvents(menuTrigger).onContextMenu
                          }
                          onKeyDown={event => {
                            explorationMenuEvents(menuTrigger).onKeyDown(event);
                            if (
                              (action || opensMenu) &&
                              (event.key === 'Enter' || event.key === ' ')
                            ) {
                              event.preventDefault();
                              if (action) action.onSelect(event.currentTarget);
                              else menuTriggers.current.get(item.id)?.click();
                            }
                          }}
                          aria-label={
                            action
                              ? `${item.label}: ${formatValue(item.value)} ${unit}. ${action.label}`
                              : opensMenu
                                ? `${item.label}: ${formatValue(item.value)} ${unit}. Actions`
                                : undefined
                          }
                          role={action || opensMenu ? 'button' : undefined}
                          data-atbl-control={
                            action || opensMenu ? 'action' : undefined
                          }
                          tabIndex={action || opensMenu ? 0 : undefined}
                          onPointerEnter={event => {
                            if (event.pointerType === 'mouse')
                              setPreviewId(item.id);
                          }}
                          onPointerLeave={event => {
                            if (event.pointerType === 'mouse')
                              setPreviewId(null);
                          }}
                        />
                      );
                    })
                )}
              </svg>
            </Tooltip>
            {!showLegend &&
              slices.map(item => {
                const actions = itemActions?.(item) ?? [];
                if (actions.length < 2) return null;
                return (
                  <span key={item.id} className="altertable-sr-only">
                    <ExplorationActionControl
                      ref={element => {
                        if (element) menuTriggers.current.set(item.id, element);
                        else menuTriggers.current.delete(item.id);
                      }}
                      actions={actions}
                      ariaLabel={`${item.label} actions`}
                      hidePrimary
                    />
                  </span>
                );
              })}
            {total === 0 && (
              <span className="altertable-pie-empty-label">
                No nonzero values
              </span>
            )}
          </div>
          {showLegend && (
            <ChartLegend
              layout="vertical"
              aria-label={`${ariaLabel} legend`}
              className="altertable-pie-legend"
            >
              {slices.map(item => {
                const actions = itemActions?.(item) ?? [];
                const action = getPrimaryExplorationAction(actions);
                const menuTrigger: RefObject<ComponentRef<'button'> | null> = {
                  get current() {
                    return menuTriggers.current.get(item.id) ?? null;
                  },
                };
                return (
                  <ChartLegend.Item key={item.id}>
                    <Tooltip
                      variant="chart"
                      content={detail(item)}
                      onOpenChange={open =>
                        setLegendId(current =>
                          open ? item.id : current === item.id ? null : current
                        )
                      }
                    >
                      {action ? (
                        <button
                          data-atbl-focus="ring"
                          data-atbl-control="action"
                          type="button"
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}, ${percent(item.share)}. ${action.label}`}
                          {...explorationMenuEvents(menuTrigger)}
                          onClick={event =>
                            action.onSelect(event.currentTarget)
                          }
                        >
                          <ChartLegend.Marker
                            kind="square"
                            color={item.color}
                          />
                          <ChartLegend.Label className="altertable-pie-label">
                            {item.label}
                          </ChartLegend.Label>
                          <strong>{formatValue(item.value)}</strong>
                          <span>{percent(item.share)}</span>
                        </button>
                      ) : actions.length > 1 ? (
                        <MenuTrigger>
                          <MenuButton
                            {...explorationMenuEvents(menuTrigger)}
                            ref={element => {
                              if (element)
                                menuTriggers.current.set(item.id, element);
                              else menuTriggers.current.delete(item.id);
                            }}
                            aria-label={`${item.label}: ${formatValue(item.value)} ${unit}, ${percent(item.share)}. Actions`}
                          >
                            <ChartLegend.Marker
                              kind="square"
                              color={item.color}
                            />
                            <ChartLegend.Label className="altertable-pie-label">
                              {item.label}
                            </ChartLegend.Label>
                            <strong>{formatValue(item.value)}</strong>
                            <span>{percent(item.share)}</span>
                          </MenuButton>
                          <ExplorationActionMenu
                            actions={actions}
                            ariaLabel={`${item.label} actions`}
                            triggerRef={menuTrigger}
                          />
                        </MenuTrigger>
                      ) : (
                        <button
                          data-atbl-focus="ring"
                          data-atbl-control="default"
                          type="button"
                          tabIndex={-1}
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}, ${percent(item.share)}`}
                        >
                          <ChartLegend.Marker
                            kind="square"
                            color={item.color}
                          />
                          <ChartLegend.Label className="altertable-pie-label">
                            {item.label}
                          </ChartLegend.Label>
                          <strong>{formatValue(item.value)}</strong>
                          <span>{percent(item.share)}</span>
                        </button>
                      )}
                    </Tooltip>
                    {action && actions.length > 1 && (
                      <ExplorationActionControl
                        ref={element => {
                          if (element)
                            menuTriggers.current.set(item.id, element);
                          else menuTriggers.current.delete(item.id);
                        }}
                        actions={actions}
                        ariaLabel={`${item.label} actions`}
                        hidePrimary={Boolean(action)}
                      />
                    )}
                  </ChartLegend.Item>
                );
              })}
            </ChartLegend>
          )}
        </>
      )}
    </section>
  );
}

import { AppIcon } from '@/src/react/ui/icons';
import { ChartLegend } from '@/src/react/ui/ChartLegend';
import { Tooltip } from '@/src/react/ui/Tooltip';
import {
  ExplorationActionControl,
  useChartActions,
  explorationMenuEvents,
  ExplorationActionMenu,
  getPrimaryExplorationAction,
} from '@/src/react/ui/ExplorationActionControl';
import { MenuButton, MenuTrigger } from '@/src/react/ui/Menu';
import { useRef, useState, type ComponentRef, type RefObject } from 'react';
import type { ChartItem, ValueChartProps } from '@/src/react/ui/chart-data';
import { validateChartIds, valueChartProblem } from '@/src/react/ui/chart-data';
import { ChartDataProblem } from '@/src/react/ui/ChartDataProblem';

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
  validateChartIds('pie', items);
  const problem = valueChartProblem('pie', items);
  const chartActions = useChartActions();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [plotOpen, setPlotOpen] = useState(false);
  const [legendId, setLegendId] = useState<string | null>(null);
  const menuTriggers = useRef(new Map<string, ComponentRef<'button'>>());
  const plotMenuTriggers = useRef(new Map<string, ComponentRef<'button'>>());
  if (problem)
    return (
      <section aria-label={ariaLabel}>
        <ChartDataProblem problem={problem} />
      </section>
    );
  const maximum = items.reduce((max, item) => Math.max(max, item.value), 0);
  const total = maximum
    ? items.reduce((sum, item) => sum + item.value / maximum, 0)
    : 0;
  let cursor = -Math.PI / 2;
  const slices: {
    row: Row;
    share: number;
    color: string;
    path: string;
  }[] = [];
  for (const [index, item] of items.entries()) {
    const share = total ? item.value / maximum / total : 0;
    const start = cursor;
    cursor += share * Math.PI * 2;
    const middle = (start + cursor) / 2;
    function point(angle: number) {
      return `${110 + Math.cos(angle) * 100},${110 + Math.sin(angle) * 100}`;
    }
    slices.push({
      row: item,
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
  function detail(slice: (typeof slices)[number]) {
    const item = slice.row;
    return (
      <>
        <strong>{item.label}</strong>
        <span>
          {formatValue(item.value)} {unit} · {percent(slice.share)}
        </span>
      </>
    );
  }
  function actionsFor(slice: (typeof slices)[number]) {
    const item = slice.row;
    return chartActions.actions(
      itemActions?.(item) ?? [],
      item.label,
      `${formatValue(item.value)} ${unit} · ${percent(slice.share)}`
    );
  }
  const preview = slices.find(slice => slice.row.id === previewId);
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
                    .filter(slice => slice.share > 0)
                    .map(slice => {
                      const item = slice.row;
                      const menuTrigger = {
                        get current() {
                          return (
                            menuTriggers.current.get(item.id) ??
                            plotMenuTriggers.current.get(item.id) ??
                            null
                          );
                        },
                      };
                      const action = getPrimaryExplorationAction(
                        actionsFor(slice)
                      );
                      const opensMenu =
                        !action && (itemActions?.(item).length ?? 0) > 1;
                      return (
                        <path
                          key={item.id}
                          d={slice.path}
                          fill={slice.color}
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
                            else if (opensMenu) menuTrigger.current?.click();
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
                              else menuTrigger.current?.click();
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
            {slices.map(slice => {
              const item = slice.row;
              const actions = actionsFor(slice);
              if (actions.length === 0) return null;
              return (
                <span key={item.id} className="altertable-sr-only">
                  <ExplorationActionControl
                    ref={element => {
                      if (element)
                        plotMenuTriggers.current.set(item.id, element);
                      else plotMenuTriggers.current.delete(item.id);
                    }}
                    actions={actions}
                    ariaLabel={`${item.label} actions`}
                    contextOnly
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
              {slices.map(slice => {
                const item = slice.row;
                const actions = actionsFor(slice);
                const menuTrigger: RefObject<ComponentRef<'button'> | null> = {
                  get current() {
                    return menuTriggers.current.get(item.id) ?? null;
                  },
                };
                const label = `${item.label}: ${formatValue(item.value)} ${unit}, ${percent(slice.share)}${actions.length ? '. Actions' : ''}`;
                const contents = (
                  <>
                    <ChartLegend.Marker kind="square" color={slice.color} />
                    <ChartLegend.Label className="altertable-pie-label">
                      {item.label}
                    </ChartLegend.Label>
                    {actions.length > 0 && (
                      <AppIcon
                        name="moreActions"
                        size={14}
                        className="altertable-pie-menu-indicator"
                      />
                    )}
                    <strong className="altertable-pie-value">
                      {formatValue(item.value)}
                    </strong>
                    <span className="altertable-pie-share">
                      {percent(slice.share)}
                    </span>
                  </>
                );
                return (
                  <ChartLegend.Item key={item.id}>
                    <Tooltip
                      variant="chart"
                      content={detail(slice)}
                      onOpenChange={open =>
                        setLegendId(current =>
                          open ? item.id : current === item.id ? null : current
                        )
                      }
                    >
                      {actions.length ? (
                        <MenuTrigger>
                          <MenuButton
                            {...explorationMenuEvents(menuTrigger)}
                            ref={element => {
                              if (element)
                                menuTriggers.current.set(item.id, element);
                              else menuTriggers.current.delete(item.id);
                            }}
                            aria-label={label}
                          >
                            {contents}
                          </MenuButton>
                          <ExplorationActionMenu
                            actions={actions}
                            ariaLabel={item.label}
                            triggerRef={menuTrigger}
                            placement="bottom start"
                          />
                        </MenuTrigger>
                      ) : (
                        <button
                          type="button"
                          data-atbl-focus="ring"
                          data-atbl-control="default"
                          tabIndex={-1}
                          aria-label={label}
                        >
                          {contents}
                        </button>
                      )}
                    </Tooltip>
                  </ChartLegend.Item>
                );
              })}
            </ChartLegend>
          )}
        </>
      )}
      {chartActions.feedback}
    </section>
  );
}

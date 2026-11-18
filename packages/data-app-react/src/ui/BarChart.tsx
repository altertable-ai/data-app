import {
  formatMetric,
  formatNumber,
  type MetricFormat,
} from '@altertable/data-app/format';
import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import {
  BarChart as RechartsBarChart,
  Cell,
  type BarShapeProps,
  usePlotArea,
} from 'recharts';

import {
  validateValueChartItems,
  type ChartItem,
  type CartesianChartProps,
} from './chart-data.ts';
import {
  ChartBar,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from './chart-primitives.tsx';
import { ChartValueFormat } from './chart-value-format.ts';
import { chartBarFill } from './chartColor.ts';
import { ChartTooltip } from './ChartTooltip.tsx';
import {
  openExplorationMenu,
  useChartActions,
  explorationMenuEvents,
  ExplorationActionMenu,
  getPrimaryExplorationAction,
} from './ExplorationActionControl.tsx';
import { AppIcon } from './icons.ts';
import { MenuButton, MenuTrigger } from './Menu.tsx';
import { useLinkedChartCursor } from './use-chart-cursor-group.tsx';
import { useChartScrollToEnd } from './use-chart-scroll-to-end.ts';

export type BarChartItem = ChartItem & {
  /** Milliseconds since the Unix epoch. Enables adaptive time ticks when no item actions are supplied. */
  time?: number;
};

const timeTickIntervals = [
  60_000,
  2 * 60_000,
  5 * 60_000,
  10 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
  2 * 24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
  14 * 24 * 60 * 60_000,
];

function timeTickIndices(items: readonly BarChartItem[], width: number) {
  if (items.length === 1) return new Set([0]);
  if (items.length < 2 || width <= 0) return new Set<number>();
  const slotWidth = width / items.length;
  const cadence = (items.at(-1)!.time! - items[0]!.time!) / (items.length - 1);
  const minimumInterval = Math.max(cadence, (100 / slotWidth) * cadence);
  const interval =
    timeTickIntervals.find(candidate => candidate >= minimumInterval) ??
    Math.ceil(minimumInterval / timeTickIntervals.at(-1)!) *
      timeTickIntervals.at(-1)!;
  const indices = new Set<number>();
  const stride = Math.max(1, Math.ceil(interval / cadence));
  const count = Math.max(
    1,
    Math.min(
      Math.floor((items.length - 1) / stride) + 1,
      Math.floor(Math.max(0, width - 60) / (stride * slotWidth)) + 1
    )
  );
  // Center the tick sequence within the supplied window so rolling windows
  // have balanced edge margins as well as a consistent interval.
  const start = Math.floor((items.length - 1 - (count - 1) * stride) / 2);
  for (let tick = 0; tick < count; tick++) {
    indices.add(start + tick * stride);
  }
  return indices;
}

export type BarChartProps<Row extends BarChartItem = BarChartItem> =
  CartesianChartProps<Row> & {
    /** Show a vertical value scale beside the bars. */
    showYAxis?: boolean;
    /** Automatically reveal the last items after updates. Disable for ranked categories. */
    scrollToEnd?: boolean;
    /** Formats the vertical axis and, unless overridden, inspected values. */
    valueFormat?: MetricFormat;
  };

function PlotBoundsObserver({
  overlayRef,
}: {
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  const plot = usePlotArea();
  const left = plot?.x;
  const width = plot?.width;

  useLayoutEffect(() => {
    if (
      left === undefined ||
      width === undefined ||
      !Number.isFinite(left) ||
      !Number.isFinite(width) ||
      !overlayRef.current
    )
      return;
    const overlay = overlayRef.current;
    overlay.style.marginLeft = `${left}px`;
    overlay.style.width = `${width}px`;
    return () => {
      overlay.style.marginLeft = '';
      overlay.style.width = '';
    };
  }, [overlayRef, left, width]);

  return null;
}

/** Nonnegative category values. Compose inside VisualizationWidget for a titled panel.
 * Owns hover/touch tooltips; no selection state or keyboard navigation. */
export function BarChart<Row extends BarChartItem>({
  items,
  unit,
  ariaLabel,
  formatValue: authoredFormatValue,
  itemActions,
  cursorGroup,
  horizontalGrid = true,
  showYAxis = false,
  scrollToEnd = true,
  valueFormat,
}: BarChartProps<Row>) {
  const formatValue =
    authoredFormatValue ??
    (valueFormat
      ? (value: number) => formatMetric(value, valueFormat)
      : formatNumber);
  // Leave space for the zero tick without moving the plot or its hit targets.
  const axisLabelSpace = showYAxis ? 10 : 0;
  validateValueChartItems('bar', items);
  const chartActions = useChartActions();
  const cursor = useLinkedChartCursor(cursorGroup);
  const linkedItem = items.find(
    item => item.time === cursor.time && cursor.time != null
  );
  const [activeId, setActiveId] = useState<string>();
  const [viewportWidth, setViewportWidth] = useState(0);
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const itemOverlayRef = useRef<HTMLDivElement>(null);
  const menuTriggers = useRef(new Map<string, ComponentRef<'button'>>());

  const maximum =
    items.reduce((max, item) => Math.max(max, item.value), 0) || 1;
  const hasTimeAxis =
    items.length > 0 &&
    items.every(
      (item, index) =>
        typeof item.time === 'number' &&
        Number.isFinite(item.time) &&
        (index === 0 || item.time > items[index - 1]!.time!)
    );
  const scrollport = useChartScrollToEnd(items, scrollToEnd);
  const compactTimeAxis = hasTimeAxis && !itemActions;
  const minimumSlotWidth = compactTimeAxis ? 3.5 : 120;
  const plotWidth = Math.max(viewportWidth, items.length * minimumSlotWidth);
  const ticks = compactTimeAxis ? timeTickIndices(items, plotWidth) : null;

  useLayoutEffect(() => {
    const element = scrollport.current;
    if (!element) return;
    function updateWidth() {
      // clientWidth rounds up fractional grid widths, which can create a
      // scrollbar and feed a different width back into this observer.
      setViewportWidth(Math.floor(element!.getBoundingClientRect().width));
    }
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollport]);

  return (
    <section
      className="altertable-selectable-bars"
      aria-label={ariaLabel}
      onPointerLeave={cursor.reset}
      onKeyDownCapture={cursor.reset}
      onPointerDownCapture={event => {
        if (event.pointerType !== 'mouse') cursor.reset();
      }}
    >
      {items.length === 0 && <span>No data</span>}
      <div
        className="altertable-selectable-bars-scroll"
        data-time-axis={compactTimeAxis || undefined}
        ref={scrollport}
      >
        <div
          className="altertable-selectable-bars-plot"
          ref={plotRef}
          style={{ width: plotWidth }}
        >
          <div
            className="altertable-chart-canvas"
            aria-hidden="true"
            ref={canvasRef}
          >
            <ChartValueFormat.Provider value={valueFormat}>
              <RechartsBarChart
                data={
                  showYAxis
                    ? items
                    : items.map(item => ({
                        ...item,
                        plotValue: item.value / maximum,
                      }))
                }
                responsive
                width="100%"
                height={220 + axisLabelSpace}
                margin={{ top: 0, right: 0, bottom: axisLabelSpace, left: 0 }}
                accessibilityLayer={false}
                tabIndex={-1}
                barCategoryGap="24%"
              >
                {showYAxis && (
                  <PlotBoundsObserver overlayRef={itemOverlayRef} />
                )}
                <ChartXAxis hide dataKey="id" scale="band" />
                {showYAxis ? (
                  <ChartYAxis domain={[0, 'auto']} />
                ) : (
                  <ChartYAxis hide domain={[0, 1]} allowDataOverflow />
                )}
                {horizontalGrid && <ChartGrid />}
                <ChartBar
                  dataKey={showYAxis ? 'value' : 'plotValue'}
                  minPointSize={value => ((value ?? 0) > 0 ? 7 : 0)}
                  background={
                    linkedItem
                      ? ({ index, x, y, width, height }: BarShapeProps) => (
                          <g>
                            {items[index]?.id === linkedItem.id && (
                              <rect
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill="var(--atbl-muted)"
                                fillOpacity={0.14}
                                pointerEvents="none"
                                aria-hidden="true"
                                data-atbl-internal-linked-cursor="true"
                              />
                            )}
                          </g>
                        )
                      : false
                  }
                >
                  {items.map(item => (
                    <Cell
                      key={item.id}
                      fill={chartBarFill}
                      opacity={activeId === item.id ? 0.75 : 1}
                      data-atbl-internal-bar-id={item.id}
                    />
                  ))}
                </ChartBar>
              </RechartsBarChart>
            </ChartValueFormat.Provider>
          </div>
          <div
            className="altertable-selectable-bars-items"
            ref={itemOverlayRef}
          >
            {items.map((item, index) => {
              const actions = chartActions.actions(
                itemActions?.(item) ?? [],
                item.label,
                `${formatValue(item.value)} ${unit}`
              );
              const action = getPrimaryExplorationAction(actions);
              const menuTrigger: RefObject<ComponentRef<'button'> | null> = {
                get current() {
                  return menuTriggers.current.get(item.id) ?? null;
                },
              };
              return (
                <Fragment key={item.id}>
                  <div
                    className="altertable-chart-item-actions"
                    onPointerMove={event => {
                      if (event.pointerType === 'mouse')
                        cursor.setTime(item.time);
                    }}
                  >
                    <ChartTooltip
                      variant="chart"
                      followCursor={false}
                      boundaryRefs={[canvasRef, scrollport]}
                      anchorRect={trigger => {
                        const bar = plotRef.current?.querySelector(
                          `[data-atbl-internal-bar-id="${CSS.escape(item.id)}"]`
                        );
                        const bounds =
                          bar?.getBoundingClientRect() ??
                          trigger?.getBoundingClientRect();
                        if (!bounds) return null;
                        const top = bar ? bounds.top : bounds.top + 220;
                        return new DOMRect(
                          bounds.left + bounds.width / 2,
                          top,
                          0,
                          0
                        );
                      }}
                      onOpenChange={open =>
                        setActiveId(current =>
                          open
                            ? item.id
                            : current === item.id
                              ? undefined
                              : current
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
                      {action ? (
                        <button
                          data-atbl-focus="ring"
                          data-atbl-control="action"
                          type="button"
                          className="altertable-selectable-bars-item"
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. ${action.label}`}
                          {...explorationMenuEvents(menuTrigger)}
                          onClick={event =>
                            action.onSelect(event.currentTarget)
                          }
                        >
                          <span className="altertable-selectable-bars-area" />
                        </button>
                      ) : actions.length ? (
                        <button
                          type="button"
                          data-atbl-focus="ring"
                          data-atbl-control="action"
                          className="altertable-selectable-bars-item"
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. Actions`}
                          {...explorationMenuEvents(menuTrigger)}
                          onClick={event =>
                            openExplorationMenu(menuTrigger, event)
                          }
                        >
                          <span className="altertable-selectable-bars-area" />
                        </button>
                      ) : (
                        <button
                          data-atbl-focus="ring"
                          data-atbl-control="default"
                          type="button"
                          tabIndex={-1}
                          className="altertable-selectable-bars-item"
                          aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                        >
                          <span className="altertable-selectable-bars-area" />
                        </button>
                      )}
                    </ChartTooltip>
                    <div
                      className="altertable-chart-item-label-row"
                      data-time-tick={ticks?.has(index) || undefined}
                    >
                      {actions.length ? (
                        <MenuTrigger>
                          <MenuButton
                            className="altertable-selectable-bars-label"
                            variant="ghost"
                            size="compact"
                            {...explorationMenuEvents(menuTrigger)}
                            ref={element => {
                              if (element)
                                menuTriggers.current.set(item.id, element);
                              else menuTriggers.current.delete(item.id);
                            }}
                            aria-label={`${item.label}: Actions`}
                          >
                            <span title={item.label}>{item.label}</span>
                            <AppIcon name="disclosure" size={12} />
                          </MenuButton>
                          <ExplorationActionMenu
                            actions={actions}
                            ariaLabel={item.label}
                            triggerRef={menuTrigger}
                            placement="bottom"
                          />
                        </MenuTrigger>
                      ) : (
                        <span className="altertable-selectable-bars-label">
                          <span title={item.label}>{item.label}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
      {chartActions.feedback}
    </section>
  );
}

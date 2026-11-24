import {
  formatMetric,
  formatNumber,
  type MetricFormat,
} from '@altertable/data-app/format';
import {
  createContext,
  Fragment,
  memo,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import {
  BarChart as RechartsBarChart,
  Cell,
  Rectangle,
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
import { FocusedWidgetContext } from './focused-widget-context.ts';
import { AppIcon } from './icons.ts';
import { MenuButton, MenuTrigger } from './Menu.tsx';
import {
  type LinkedChartCursor,
  useLinkedChartCursor,
  useLinkedCursorValue,
} from './use-chart-cursor-group.tsx';
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
  const top = plot?.y;
  const width = plot?.width;

  useLayoutEffect(() => {
    if (
      left === undefined ||
      top === undefined ||
      width === undefined ||
      !Number.isFinite(left) ||
      !Number.isFinite(top) ||
      !Number.isFinite(width) ||
      !overlayRef.current
    )
      return;
    const overlay = overlayRef.current;
    overlay.style.top = `${top}px`;
    overlay.style.marginLeft = `${left}px`;
    overlay.style.width = `${width}px`;
    return () => {
      overlay.style.top = '';
      overlay.style.marginLeft = '';
      overlay.style.width = '';
    };
  }, [overlayRef, left, top, width]);

  return null;
}

const ActiveBarIdContext = createContext<string | undefined>(undefined);

/** Reads the hovered id itself, so moving between bars redraws two bars, not the plot. */
function HighlightedBar(props: BarShapeProps) {
  const id = (props as { 'data-atbl-internal-bar-id'?: string })[
    'data-atbl-internal-bar-id'
  ];
  const active = useContext(ActiveBarIdContext) === id;
  return useMemo(
    () => <Rectangle {...props} opacity={active ? 0.75 : 1} />,
    [props, active]
  );
}

function renderHighlightedBar(props: BarShapeProps) {
  return <HighlightedBar {...props} />;
}

function minimumBarSize(value: number | null | undefined) {
  return (value ?? 0) > 0 ? 7 : 0;
}

/** Subscribes per bar, so a peer cursor repaints two backgrounds instead of the chart. */
function LinkedBarBackground({
  cursor,
  time,
  x,
  y,
  width,
  height,
}: {
  cursor: LinkedChartCursor;
  time: number | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const linked = useLinkedCursorValue(
    cursor,
    peerTime => time != null && peerTime === time
  );
  return (
    <g>
      {linked && (
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
  );
}

type BarChartItemsProps<Row extends BarChartItem> = {
  items: readonly Row[];
  unit: string;
  formatValue: (value: number) => string;
  itemActions: CartesianChartProps<Row>['itemActions'];
  actions: ReturnType<typeof useChartActions>['actions'];
  cursor: LinkedChartCursor;
  ticks: ReadonlySet<number> | null;
  setActiveId: Dispatch<SetStateAction<string | undefined>>;
  plotRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLDivElement | null>;
  scrollport: RefObject<HTMLDivElement | null>;
};

/** Hit targets and tooltips stay mounted while the plot highlights a bar. */
const BarChartItems = memo(function BarChartItems<Row extends BarChartItem>({
  items,
  unit,
  formatValue,
  itemActions,
  actions: chartActions,
  cursor,
  ticks,
  setActiveId,
  plotRef,
  canvasRef,
  scrollport,
}: BarChartItemsProps<Row>) {
  const focused = useContext(FocusedWidgetContext);
  const menuTriggers = useRef(new Map<string, ComponentRef<'button'>>());
  return items.map((item, index) => {
    const actions = chartActions(
      focused ? [] : (itemActions?.(item) ?? []),
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
            if (event.pointerType === 'mouse') cursor.setTime(item.time);
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
              return new DOMRect(bounds.left + bounds.width / 2, top, 0, 0);
            }}
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
            {focused ? (
              <span
                className="altertable-selectable-bars-area"
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This label describes the chart mark.
                role="img"
                aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
              />
            ) : action ? (
              <button
                data-atbl-focus="ring"
                data-atbl-control="action"
                type="button"
                className="altertable-selectable-bars-item"
                aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. ${action.label}`}
                {...explorationMenuEvents(menuTrigger)}
                onClick={event => action.onSelect(event.currentTarget)}
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
                onClick={event => openExplorationMenu(menuTrigger, event)}
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
                    if (element) menuTriggers.current.set(item.id, element);
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
  });
}) as <Row extends BarChartItem>(props: BarChartItemsProps<Row>) => ReactNode;

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
  const formatValue = useMemo(
    () =>
      authoredFormatValue ??
      (valueFormat
        ? (value: number) => formatMetric(value, valueFormat)
        : formatNumber),
    [authoredFormatValue, valueFormat]
  );
  // Keep the centered endpoint ticks inside the SVG while preserving plot height.
  const axisLabelSpace = showYAxis ? 10 : 0;
  validateValueChartItems('bar', items);
  const chartActions = useChartActions();
  const cursor = useLinkedChartCursor(cursorGroup);
  const [activeId, setActiveId] = useState<string>();
  const [viewportWidth, setViewportWidth] = useState(0);
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const itemOverlayRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (showYAxis) return items;
    const maximum =
      items.reduce((max, item) => Math.max(max, item.value), 0) || 1;
    return items.map(item => ({ ...item, plotValue: item.value / maximum }));
  }, [items, showYAxis]);
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
  const ticks = useMemo(
    () => (compactTimeAxis ? timeTickIndices(items, plotWidth) : null),
    [compactTimeAxis, items, plotWidth]
  );
  const linkedBackground = useCallback(
    ({ originalDataIndex, x, y, width, height }: BarShapeProps) => (
      <LinkedBarBackground
        cursor={cursor}
        time={items[originalDataIndex]?.time}
        x={x}
        y={y}
        width={width}
        height={height}
      />
    ),
    [cursor, items]
  );
  const linked = cursorGroup != null;
  // Hover only changes the highlighted cell; keep the rest of the plot stable.
  const plot = useMemo(
    () => (
      <ChartValueFormat value={valueFormat}>
        <RechartsBarChart
          data={data}
          responsive
          width="100%"
          height={220 + 2 * axisLabelSpace}
          margin={{
            top: axisLabelSpace,
            right: 0,
            bottom: axisLabelSpace,
            left: 0,
          }}
          accessibilityLayer={false}
          tabIndex={-1}
          barCategoryGap="24%"
        >
          {showYAxis && <PlotBoundsObserver overlayRef={itemOverlayRef} />}
          <ChartXAxis hide dataKey="id" scale="band" />
          {showYAxis ? (
            <ChartYAxis domain={[0, 'auto']} />
          ) : (
            <ChartYAxis hide domain={[0, 1]} allowDataOverflow />
          )}
          {horizontalGrid && <ChartGrid />}
          <ChartBar
            dataKey={showYAxis ? 'value' : 'plotValue'}
            minPointSize={minimumBarSize}
            background={linked ? linkedBackground : false}
            shape={renderHighlightedBar}
          >
            {items.map(item => (
              <Cell
                key={item.id}
                fill={chartBarFill}
                data-atbl-internal-bar-id={item.id}
              />
            ))}
          </ChartBar>
        </RechartsBarChart>
      </ChartValueFormat>
    ),
    [
      valueFormat,
      data,
      axisLabelSpace,
      showYAxis,
      horizontalGrid,
      linked,
      linkedBackground,
      items,
    ]
  );

  useLayoutEffect(() => {
    const element = scrollport.current;
    if (!element) return;
    function updateWidth() {
      // clientWidth rounds up fractional grid widths, which can create a
      // scrollbar and feed a different width back into this observer. The
      // plot fills the content box, inside the padding kept for focus rings.
      const style = getComputedStyle(element!);
      const padding =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      setViewportWidth(
        Math.floor(element!.getBoundingClientRect().width - padding)
      );
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
        style={
          {
            '--atbl-internal-bar-axis-space': `${axisLabelSpace}px`,
          } as CSSProperties
        }
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
            <ActiveBarIdContext value={activeId}>{plot}</ActiveBarIdContext>
          </div>
          <div
            className="altertable-selectable-bars-items"
            ref={itemOverlayRef}
          >
            <BarChartItems
              items={items}
              unit={unit}
              formatValue={formatValue}
              itemActions={itemActions}
              actions={chartActions.actions}
              cursor={cursor}
              ticks={ticks}
              setActiveId={setActiveId}
              plotRef={plotRef}
              canvasRef={canvasRef}
              scrollport={scrollport}
            />
          </div>
        </div>
      </div>
      {chartActions.feedback}
    </section>
  );
}

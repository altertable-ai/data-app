import { formatNumber } from '@altertable/data-app/format';
import {
  createContext,
  Fragment,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type PointerEvent,
  type SetStateAction,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  AreaChart as RechartsAreaChart,
  LineChart as RechartsLineChart,
  ReferenceLine,
} from 'recharts';

import type { CartesianChartItem, CartesianChartProps } from './chart-data.ts';
import { validateValueChartItems } from './chart-data.ts';
import {
  ChartArea,
  ChartLine,
  ChartDot,
  ChartXAxis,
  ChartYAxis,
  ChartGrid,
} from './chart-primitives.tsx';
import { ChartTooltip } from './ChartTooltip.tsx';
import {
  ExplorationActionControl,
  useChartActions,
  explorationMenuEvents,
  ExplorationActionMenu,
  getPrimaryExplorationAction,
} from './ExplorationActionControl.tsx';
import { FocusedWidgetContext } from './focused-widget-context.ts';
import { MenuButton, MenuTrigger } from './Menu.tsx';
import {
  type LinkedChartCursor,
  useLinkedChartCursor,
  useLinkedCursorValue,
} from './use-chart-cursor-group.tsx';
import { useChartScrollToEnd } from './use-chart-scroll-to-end.ts';

const HighlightedSampleContext = createContext<number | undefined>(undefined);

/** Reads the highlighted index itself, so moving between samples skips the plot. */
function TrendSample({
  index,
  cx,
  cy,
}: {
  index: number | undefined;
  cx: number | undefined;
  cy: number | undefined;
}) {
  const highlighted = useContext(HighlightedSampleContext) === index;
  return (
    <g data-atbl-internal-sample={index} transform={`translate(${cx}, ${cy})`}>
      {highlighted && <ChartDot cx={0} cy={0} active />}
    </g>
  );
}

function LinkedTrendCursor({
  cursor,
  items,
}: {
  cursor: LinkedChartCursor;
  items: readonly CartesianChartItem[];
}) {
  const id = useLinkedCursorValue(cursor, time =>
    time == null ? undefined : items.find(item => item.time === time)?.id
  );
  return id == null ? null : (
    <ReferenceLine
      x={id}
      stroke="var(--atbl-muted)"
      strokeOpacity={0.3}
      pointerEvents="none"
      data-atbl-internal-linked-cursor="true"
    />
  );
}

type TrendChartItemsProps<Row extends CartesianChartItem> = {
  items: readonly Row[];
  unit: string;
  formatValue: (value: number) => string;
  itemActions: CartesianChartProps<Row>['itemActions'];
  actions: ReturnType<typeof useChartActions>['actions'];
  setActiveIndex: Dispatch<SetStateAction<number | undefined>>;
  onInspectAction: (event: ReactMouseEvent<HTMLDivElement>) => void;
  'aria-describedby'?: string;
};

/** Hit targets and tooltips stay mounted while the pointer moves between samples. */
const TrendChartItems = memo(function TrendChartItems<
  Row extends CartesianChartItem,
>({
  items,
  unit,
  formatValue,
  itemActions,
  actions: chartActions,
  setActiveIndex,
  onInspectAction,
  'aria-describedby': describedBy,
}: TrendChartItemsProps<Row>) {
  const focused = useContext(FocusedWidgetContext);
  const menuTriggers = useRef(new Map<string, ComponentRef<'button'>>());
  return (
    <div
      className="altertable-trend-points"
      aria-describedby={describedBy}
      onClickCapture={onInspectAction}
      onContextMenuCapture={onInspectAction}
    >
      {items.map((item, index) => {
        const declaredActions = focused ? [] : (itemActions?.(item) ?? []);
        const actions = chartActions(
          declaredActions,
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
            <div className="altertable-chart-item-actions">
              <ChartTooltip
                variant="chart"
                mouseHover={false}
                followCursor={false}
                onOpenChange={open =>
                  setActiveIndex(current =>
                    open ? index : current === index ? undefined : current
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
                    className="altertable-trend-point"
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This mark is drawn with CSS, without an image source.
                    role="img"
                    aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                  >
                    <span className="altertable-trend-hit" />
                    <span className="altertable-trend-label">{item.label}</span>
                  </span>
                ) : action ? (
                  <button
                    data-atbl-focus="ring"
                    data-atbl-control="action"
                    type="button"
                    className="altertable-trend-point"
                    aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. ${action.label}`}
                    {...explorationMenuEvents(menuTrigger)}
                    onClick={event => action.onSelect(event.currentTarget)}
                  >
                    <span className="altertable-trend-hit" />
                    <span className="altertable-trend-label">{item.label}</span>
                  </button>
                ) : actions.length > 1 ? (
                  <MenuTrigger>
                    <MenuButton
                      {...explorationMenuEvents(menuTrigger)}
                      ref={element => {
                        if (element) menuTriggers.current.set(item.id, element);
                        else menuTriggers.current.delete(item.id);
                      }}
                      className="altertable-trend-point"
                      aria-label={`${item.label}: ${formatValue(item.value)} ${unit}. Actions`}
                    >
                      <span className="altertable-trend-hit" />
                      <span className="altertable-trend-label">
                        {item.label}
                      </span>
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
                    className="altertable-trend-point"
                    aria-label={`${item.label}: ${formatValue(item.value)} ${unit}`}
                  >
                    <span className="altertable-trend-hit" />
                    <span className="altertable-trend-label">{item.label}</span>
                  </button>
                )}
              </ChartTooltip>
              {action && (
                <ExplorationActionControl
                  contextOnly={declaredActions.length === 1}
                  indicator="chevron"
                  ref={element => {
                    if (element) menuTriggers.current.set(item.id, element);
                    else menuTriggers.current.delete(item.id);
                  }}
                  actions={actions}
                  ariaLabel={`${item.label} actions`}
                  hidePrimary={Boolean(action)}
                />
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}) as <Row extends CartesianChartItem>(
  props: TrendChartItemsProps<Row>
) => ReactNode;

/** Ordered, equally spaced samples; negative values share an explicit zero baseline. */
export function TrendChart<Row extends CartesianChartItem>({
  items,
  unit,
  ariaLabel,
  formatValue = formatNumber,
  kind,
  itemActions,
  cursorGroup,
  horizontalGrid = true,
}: CartesianChartProps<Row> & { kind: 'line' | 'area' }) {
  validateValueChartItems(kind, items);
  const Plot = kind === 'area' ? RechartsAreaChart : RechartsLineChart;
  const chartActions = useChartActions();
  const cursor = useLinkedChartCursor(cursorGroup);
  const [activeIndex, setActiveIndex] = useState<number>();
  const [nearestIndex, setNearestIndex] = useState<number>();
  const [mouseVisible, setMouseVisible] = useState(false);
  const mouseVisibleRef = useRef(false);
  const nearest = useRef<number | undefined>(undefined);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const highlightedIndex = mouseVisible ? nearestIndex : activeIndex;
  const scrollport = useChartScrollToEnd(items);
  const { data, low, high } = useMemo(() => {
    const magnitude = items.reduce(
      (max, item) => Math.max(max, Math.abs(item.value)),
      1
    );
    return {
      data: items.map(item => ({
        ...item,
        plotValue: item.value / magnitude,
      })),
      low: items.reduce(
        (min, item) => Math.min(min, item.value / magnitude),
        0
      ),
      high: items.reduce(
        (max, item) => Math.max(max, item.value / magnitude),
        0
      ),
    };
  }, [items]);
  const renderSample = useCallback(
    ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
      if (index != null && cx != null && cy != null)
        points.current.set(index, { x: cx, y: cy });
      return <TrendSample index={index} cx={cx} cy={cy} />;
    },
    []
  );
  // Inspection only moves the highlighted sample; keep the plot stable.
  const plot = useMemo(
    () => (
      <Plot
        data={data}
        responsive
        width="100%"
        height={220}
        margin={{ top: 12, right: 0, bottom: 12, left: 0 }}
        accessibilityLayer={false}
        tabIndex={-1}
      >
        <ChartXAxis hide dataKey="id" scale="band" />
        <ChartYAxis hide domain={[low, high === low ? low + 1 : high]} />
        <ReferenceLine y={0} stroke="var(--atbl-border)" />
        {horizontalGrid && <ChartGrid />}
        {kind === 'area' && (
          <ChartArea
            dataKey="plotValue"
            stroke="none"
            fill="var(--atbl-chart-1)"
            dot={false}
            activeDot={false}
          />
        )}
        <ChartLine dataKey="plotValue" dot={renderSample} activeDot={false} />
        <LinkedTrendCursor cursor={cursor} items={items} />
      </Plot>
    ),
    [Plot, data, low, high, horizontalGrid, kind, renderSample, cursor, items]
  );
  function screenPoint(index: number | undefined) {
    if (index == null) return null;
    const point = points.current.get(index);
    const matrix = plotRef.current?.querySelector('svg')?.getScreenCTM();
    return point && matrix
      ? new DOMPoint(point.x, point.y).matrixTransform(matrix)
      : null;
  }
  function inspectNearest(event: PointerEvent<HTMLSpanElement>) {
    if (event.pointerType !== 'mouse') return;
    const matrix = plotRef.current?.querySelector('svg')?.getScreenCTM();
    if (!matrix) return;
    let distance = Infinity;
    let selected: number | undefined;
    const viewport = scrollport.current?.getBoundingClientRect();
    const overLabels =
      event.clientY >=
      (plotRef.current?.getBoundingClientRect().top ?? 0) + 220;
    for (let index = 0; index < items.length; index++) {
      const sample = points.current.get(index);
      if (!sample) continue;
      const point = new DOMPoint(sample.x, sample.y).matrixTransform(matrix);
      if (viewport && (point.x < viewport.left || point.x > viewport.right))
        continue;
      const candidate = overLabels
        ? Math.abs(point.x - event.clientX)
        : Math.hypot(point.x - event.clientX, point.y - event.clientY);
      if (candidate < distance) {
        distance = candidate;
        selected = index;
      }
    }
    nearest.current = selected;
    setNearestIndex(selected);
    cursor.setTime(selected == null ? undefined : items[selected]?.time);
  }
  const inspectAction = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (
        !mouseVisibleRef.current ||
        nearest.current == null ||
        !(event.target instanceof Element)
      )
        return;
      if (
        event.clientY >=
        (plotRef.current?.getBoundingClientRect().top ?? 0) + 220
      )
        return;
      if (event.type === 'click' && event.detail === 0) return;
      if (
        event.type === 'contextmenu' &&
        event.clientX === 0 &&
        event.clientY === 0
      )
        return;
      const target = event.target.closest('.altertable-trend-point');
      const selected = plotRef.current?.querySelectorAll<HTMLButtonElement>(
        '.altertable-trend-point'
      )[nearest.current];
      if (!target || !selected || target === selected) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'click') selected.click();
      else
        selected.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
            clientX: event.clientX,
            clientY: event.clientY,
          })
        );
    },
    []
  );
  return (
    <section
      className="altertable-trend-chart"
      aria-label={ariaLabel}
      onPointerLeave={cursor.reset}
      onKeyDownCapture={cursor.reset}
      onPointerDownCapture={event => {
        if (event.pointerType !== 'mouse') cursor.reset();
      }}
    >
      {items.length === 0 && <span>No data</span>}
      {items.length > 0 && (
        <>
          <div className="altertable-trend-scroll" ref={scrollport}>
            <div
              className="altertable-trend-plot"
              ref={plotRef}
              style={{ minWidth: items.length * 40 }}
            >
              <div
                className="altertable-chart-canvas"
                aria-hidden="true"
                ref={canvasRef}
              >
                <HighlightedSampleContext value={highlightedIndex}>
                  {plot}
                </HighlightedSampleContext>
              </div>
              <ChartTooltip
                variant="chart"
                touchInspection={false}
                boundaryRefs={[canvasRef, scrollport]}
                onPointerEnter={inspectNearest}
                onPointerMove={inspectNearest}
                onPointerLeave={cursor.reset}
                onOpenChange={open => {
                  mouseVisibleRef.current = open;
                  setMouseVisible(open);
                }}
                anchorRect={() => {
                  const point = screenPoint(nearest.current);
                  return point ? new DOMRect(point.x, point.y, 0, 0) : null;
                }}
                content={
                  nearestIndex == null || !items[nearestIndex] ? null : (
                    <>
                      <strong>{items[nearestIndex].label}</strong>
                      <span>
                        {formatValue(items[nearestIndex].value)} {unit}
                      </span>
                    </>
                  )
                }
              >
                <TrendChartItems
                  items={items}
                  unit={unit}
                  formatValue={formatValue}
                  itemActions={itemActions}
                  actions={chartActions.actions}
                  setActiveIndex={setActiveIndex}
                  onInspectAction={inspectAction}
                />
              </ChartTooltip>
            </div>
          </div>
        </>
      )}
      {chartActions.feedback}
    </section>
  );
}

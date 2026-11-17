import { type MetricFormat } from '@altertable/data-app/format';
import {
  Children,
  Fragment,
  isValidElement,
  cloneElement,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type PointerEvent,
  type ComponentProps,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  ComposedChart as RechartsComposedChart,
  CartesianGrid as NativeCartesianGrid,
  ZAxis,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,
  Cell,
  Line as NativeLine,
  Bar as NativeBar,
  Area as NativeArea,
  Scatter as NativeScatter,
  XAxis as NativeXAxis,
  YAxis as NativeYAxis,
  Legend as NativeLegend,
  useOffset,
  useMargin,
  Label,
  LabelList,
  ErrorBar,
} from 'recharts';

import type { HorizontalGridProps } from './chart-data.ts';
import { ChartDateAxes } from './chart-date-axis.tsx';
import {
  ChartInteractionContext,
  ChartRegistrationContext,
  chartAxisKey,
  type ChartBarPoint,
  type ChartDataKey,
  type ChartPoint,
} from './chart-interaction.tsx';
import {
  ChartLegendInteractionContext,
  chartLegendSeriesKey,
  reconcileLegendFocus,
  toggleLegendFocus,
} from './chart-legend-interaction.tsx';
import {
  ChartBar as Bar,
  ChartDot as Dot,
  ChartLine as Line,
  ChartArea as Area,
  ChartScatter as Scatter,
  ChartXAxis as XAxis,
  ChartYAxis as YAxis,
  ChartGrid as CartesianGrid,
  ChartTooltip as Tooltip,
} from './chart-primitives.tsx';
import { ChartValueFormat } from './chart-value-format.ts';
import { classNames } from './classNames.ts';
import { ComposedChartLegend as Legend } from './ComposedChartLegend.tsx';
import {
  type ChartCursorGroup,
  ChartCursorChartContext,
  useLinkedChartCursor,
} from './use-chart-cursor-group.tsx';

function findNearestSeriesId(
  hoveredSeriesId: string | null,
  points: ReadonlyMap<string, ChartPoint>,
  position: ChartPoint | null
) {
  // Bars and scatter points use direct hits; line and area samples use distance.
  if (!position || (hoveredSeriesId != null && !points.has(hoveredSeriesId)))
    return hoveredSeriesId;
  let selected = hoveredSeriesId;
  let distance = Infinity;
  for (const [id, point] of points) {
    const candidate = Math.hypot(point.x - position.x, point.y - position.y);
    if (candidate < distance) {
      distance = candidate;
      selected = id;
    }
  }
  return selected;
}

function findNearestBar(
  bars: ReadonlyMap<string, ChartBarPoint>,
  position: ChartPoint | null,
  layout: 'horizontal' | 'vertical'
) {
  if (!position) return null;
  let nearest: ChartBarPoint | null = null;
  let categoryDistance = Infinity;
  let valueDistance = Infinity;
  for (const bar of bars.values()) {
    const category =
      layout === 'horizontal'
        ? Math.abs(position.x - (bar.x + bar.width / 2))
        : Math.abs(position.y - (bar.y + bar.height / 2));
    const value =
      layout === 'horizontal'
        ? Math.max(bar.y - position.y, 0, position.y - bar.y - bar.height)
        : Math.max(bar.x - position.x, 0, position.x - bar.x - bar.width);
    if (
      category < categoryDistance ||
      (category === categoryDistance && value < valueDistance)
    ) {
      nearest = bar;
      categoryDistance = category;
      valueDistance = value;
    }
  }
  return nearest;
}

function barCloserThanPoints(
  bar: ChartBarPoint | null,
  points: ReadonlyMap<string, ChartPoint>,
  position: ChartPoint | null
) {
  if (!bar || !position) return false;
  const dx = Math.max(bar.x - position.x, 0, position.x - bar.x - bar.width);
  const dy = Math.max(bar.y - position.y, 0, position.y - bar.y - bar.height);
  const barDistance = Math.hypot(dx, dy);
  let pointDistance = Infinity;
  for (const point of points.values()) {
    pointDistance = Math.min(
      pointDistance,
      Math.hypot(point.x - position.x, point.y - position.y)
    );
  }
  return barDistance <= pointDistance;
}

function categoryDataKey(
  children: ReactNode,
  layout: 'horizontal' | 'vertical',
  axisId: string | number
): ChartDataKey | undefined {
  for (const child of Children.toArray(children)) {
    if (
      !isValidElement<{
        children?: ReactNode;
        dataKey?: unknown;
        xAxisId?: string | number;
        yAxisId?: string | number;
      }>(child)
    )
      continue;
    if (child.type === Fragment) {
      const nested = categoryDataKey(child.props.children, layout, axisId);
      if (nested != null) return nested;
    }
    if (
      child.type !== (layout === 'horizontal' ? XAxis : YAxis) &&
      child.type !== (layout === 'horizontal' ? NativeXAxis : NativeYAxis)
    )
      continue;
    if (
      ((layout === 'horizontal' ? child.props.xAxisId : child.props.yAxisId) ??
        0) !== axisId
    )
      continue;
    const key = child.props.dataKey;
    if (
      typeof key === 'string' ||
      typeof key === 'number' ||
      typeof key === 'function'
    )
      return key as ChartDataKey;
  }
  return undefined;
}

export type ComposedChartProps<Row = unknown> = HorizontalGridProps &
  Omit<ComponentProps<typeof RechartsComposedChart<Row>>, 'data' | 'title'> & {
    /** Displayed rows; series and axes select fields with Recharts dataKey props. */
    data: readonly Row[];
    /** Describes the measures and scope for assistive technology. */
    ariaLabel: string;
    /** Shared measure semantics: compact numeric axes and precise tooltips.
     * For mixed units, use explicit axis tickFormatter and series/tooltip formatters. */
    valueFormat?: MetricFormat;
    /** Share mouse-hover timestamps with charts receiving the same handle, using the temporal X axis. */
    cursorGroup?: ChartCursorGroup;
  };

function hasAuthoredGrid(children: ReactNode): boolean {
  return Children.toArray(children).some(
    child =>
      isValidElement<{ children?: ReactNode }>(child) &&
      (child.type === CartesianGrid ||
        child.type === NativeCartesianGrid ||
        (child.type === Fragment && hasAuthoredGrid(child.props.children)))
  );
}

function countNativeSeriesKeys(
  children: ReactNode,
  counts = new Map<string, number>()
) {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      countNativeSeriesKeys(
        (child.props as { children?: ReactNode }).children,
        counts
      );
    } else if (
      child.type === NativeLine ||
      child.type === NativeBar ||
      child.type === NativeArea ||
      child.type === NativeScatter
    ) {
      const props = child.props as { id?: string; dataKey?: unknown };
      const key = chartLegendSeriesKey(props.id, props.dataKey);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });
  return counts;
}

function nativeSeriesId(
  props: { id?: string; dataKey?: unknown },
  child: ReactElement,
  index: number,
  path: string,
  keyCounts: ReadonlyMap<string, number>
) {
  if (props.id != null) return props.id;
  const key = chartLegendSeriesKey(undefined, props.dataKey);
  return !key || (keyCounts.get(key) ?? 0) > 1
    ? `atbl-native-${path}-${child.key ?? index}`
    : undefined;
}

function applyNativeLegendInteraction(
  children: ReactNode,
  focusedKeys: ReadonlySet<string> | null,
  hoveredKey: string | null,
  suppressPlotInspection: boolean,
  valueAxis: 'x' | 'y',
  visibleBarAxisIds: ReadonlySet<string | number>,
  fullAxisSpace: { left: number; right: number } | null,
  yAxisSideCounts: { left: number; right: number },
  keyCounts: ReadonlyMap<string, number>,
  path = 'root'
): ReactNode {
  return Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) {
      const props = child.props as { children?: ReactNode };
      return cloneElement(child, {
        children: applyNativeLegendInteraction(
          props.children,
          focusedKeys,
          hoveredKey,
          suppressPlotInspection,
          valueAxis,
          visibleBarAxisIds,
          fullAxisSpace,
          yAxisSideCounts,
          keyCounts,
          `${path}-${child.key ?? index}`
        ),
      } as { children: ReactNode });
    }
    if (child.type === XAxis || child.type === NativeXAxis) {
      const axis = child as ReactElement<{
        xAxisId?: string | number;
        includeHidden?: boolean;
        domain?: unknown;
        ticks?: unknown;
      }>;
      if (valueAxis === 'y')
        return cloneElement(axis, {
          includeHidden: axis.props.includeHidden ?? true,
        });
      if (!focusedKeys || axis.props.domain != null || axis.props.ticks != null)
        return child;
      return cloneElement(axis, {
        domain: visibleBarAxisIds.has(axis.props.xAxisId ?? 0)
          ? [0, 'auto']
          : ['auto', 'auto'],
      });
    }
    if (child.type === YAxis || child.type === NativeYAxis) {
      const axis = child as ReactElement<{
        yAxisId?: string | number;
        includeHidden?: boolean;
        domain?: unknown;
        ticks?: unknown;
        width?: number | 'auto';
        orientation?: 'left' | 'right';
      }>;
      if (valueAxis === 'x')
        return cloneElement(axis, {
          includeHidden: axis.props.includeHidden ?? true,
        });
      if (!focusedKeys || axis.props.domain != null || axis.props.ticks != null)
        return child;
      const side = axis.props.orientation ?? 'left';
      const reservedWidth =
        (axis.props.width === 'auto' ||
          (child.type === YAxis && axis.props.width == null)) &&
        yAxisSideCounts[side] === 1
          ? fullAxisSpace?.[side]
          : undefined;
      return cloneElement(axis, {
        domain: visibleBarAxisIds.has(axis.props.yAxisId ?? 0)
          ? [0, 'auto']
          : ['auto', 'auto'],
        ...(reservedWidth != null && { width: reservedWidth }),
      });
    }
    if (
      child.type !== NativeLine &&
      child.type !== NativeBar &&
      child.type !== NativeArea &&
      child.type !== NativeScatter
    )
      return child;
    const series = child as ReactElement<{
      id?: string;
      dataKey?: unknown;
      hide?: boolean;
      opacity?: number;
      style?: { pointerEvents?: string };
      dot?: unknown;
      activeDot?: unknown;
    }>;
    const id = nativeSeriesId(series.props, child, index, path, keyCounts);
    const key = chartLegendSeriesKey(id, series.props.dataKey)!;
    const excluded = !!(focusedKeys && !focusedKeys.has(key));
    return cloneElement(series, {
      id,
      hide: excluded || series.props.hide,
      opacity: excluded
        ? 0
        : hoveredKey &&
            (!focusedKeys || focusedKeys.has(hoveredKey)) &&
            hoveredKey !== key
          ? 0.2
          : series.props.opacity,
      style: {
        ...series.props.style,
        pointerEvents: excluded ? 'none' : series.props.style?.pointerEvents,
      },
      ...(excluded && (child.type === NativeLine || child.type === NativeArea)
        ? { dot: false, activeDot: false }
        : {}),
      ...(suppressPlotInspection &&
      (child.type === NativeLine || child.type === NativeArea)
        ? { activeDot: false }
        : {}),
    });
  });
}

function collectVisibleNativeBarAxisIds(
  children: ReactNode,
  focusedKeys: ReadonlySet<string> | null,
  valueAxis: 'x' | 'y',
  keyCounts: ReadonlyMap<string, number>,
  path = 'root',
  ids = new Set<string | number>()
) {
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectVisibleNativeBarAxisIds(
        (child.props as { children?: ReactNode }).children,
        focusedKeys,
        valueAxis,
        keyCounts,
        `${path}-${child.key ?? index}`,
        ids
      );
    } else if (child.type === NativeBar) {
      const props = child.props as {
        id?: string;
        dataKey?: unknown;
        hide?: boolean;
        xAxisId?: string | number;
        yAxisId?: string | number;
      };
      const id = nativeSeriesId(props, child, index, path, keyCounts);
      const key = chartLegendSeriesKey(id, props.dataKey)!;
      if (!props.hide && (!focusedKeys || focusedKeys.has(key))) {
        ids.add(
          valueAxis === 'x' ? (props.xAxisId ?? 0) : (props.yAxisId ?? 0)
        );
      }
    }
  });
  return ids;
}

function inspectAxisLayout(
  children: ReactNode,
  layout = { left: 0, right: 0, autoYAxis: false, interactiveLegend: false }
) {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      inspectAxisLayout(
        (child.props as { children?: ReactNode }).children,
        layout
      );
    } else if (child.type === YAxis || child.type === NativeYAxis) {
      const props = child.props as {
        hide?: boolean;
        mirror?: boolean;
        orientation?: 'left' | 'right';
        width?: number | 'auto';
      };
      if (!props.hide && !props.mirror) {
        layout[props.orientation ?? 'left']++;
        if (
          props.width === 'auto' ||
          (child.type === YAxis && props.width == null)
        )
          layout.autoYAxis = true;
      }
    } else if (child.type === Legend || child.type === NativeLegend) {
      const props = child.props as {
        position?: string;
        align?: string;
        layout?: string;
        interactive?: boolean;
      };
      if (child.type === Legend && props.interactive !== false)
        layout.interactiveLegend = true;
      const side =
        props.position === 'left' || props.position === 'right'
          ? props.position
          : props.layout === 'vertical' &&
              (props.align === 'left' || props.align === 'right')
            ? props.align
            : null;
      if (side) layout[side]++;
    }
  });
  return layout;
}

function PlotOffsets({
  onChange,
}: {
  onChange: (left: number, right: number) => void;
}) {
  const offset = useOffset();
  const margin = useMargin();
  const left = offset?.left;
  const right = offset?.right;
  const marginLeft = margin?.left ?? 5;
  const marginRight = margin?.right ?? 5;
  useLayoutEffect(() => {
    if (left != null && right != null)
      onChange(left - marginLeft, right - marginRight);
  }, [left, right, marginLeft, marginRight, onChange]);
  return null;
}

/** Compose Cartesian series inside VisualizationWidget. Defaults to responsive
 * full width and 300px height. Children retain native Recharts props and behavior,
 * including stacking, numeric/time axes, missing values, tooltips, and keyboard
 * navigation. Match yAxisId on axes and series for different units; use stackId
 * for stacks. Preserve missing measures as null and choose connectNulls deliberately.
 * Use public chart tokens for series colors. Dataset bindings own
 * loading, empty results, evidence, and CSV; this primitive owns only the plot. */
function ComposedChartRoot<Row>({
  data,
  ariaLabel,
  valueFormat,
  cursorGroup,
  horizontalGrid = false,
  children,
  width = '100%',
  height = 300,
  responsive = true,
  layout = 'horizontal',
  className,
  ...props
}: ComposedChartProps<Row>) {
  const cursor = useLinkedChartCursor(cursorGroup);
  const [mouseHover, setMouseHover] = useState(false);
  const [hasPointerFocus, setHasPointerFocus] = useState(false);
  const [isPointerInspection, setIsPointerInspection] = useState(false);
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [pointerPosition, setPointerPosition] = useState<ChartPoint | null>(
    null
  );
  const [nearestBar, setNearestBar] = useState<ChartBarPoint | null>(null);
  const latestPointerPosition = useRef<ChartPoint | null>(null);
  const [points, setPoints] = useState<ReadonlyMap<string, ChartPoint>>(
    () => new Map()
  );
  const bars = useRef(new Map<string, ChartBarPoint>());
  const barRefreshFrame = useRef<number | null>(null);
  const refreshNearestBar = useCallback(() => {
    if (barRefreshFrame.current != null || !latestPointerPosition.current)
      return;
    // Bar shapes register in separate layout effects; inspect the complete
    // geometry once per frame instead of updating the chart for every bar.
    barRefreshFrame.current = requestAnimationFrame(() => {
      barRefreshFrame.current = null;
      const selected = findNearestBar(
        bars.current,
        latestPointerPosition.current,
        layout
      );
      setNearestBar(selected);
      setPointerPosition(latestPointerPosition.current);
    });
  }, [layout]);
  useEffect(
    () => () => {
      if (barRefreshFrame.current != null)
        cancelAnimationFrame(barRefreshFrame.current);
    },
    []
  );
  const registerBar = useCallback(
    (bar: ChartBarPoint) => {
      const key = `${bar.seriesId}:${bar.index}`;
      bars.current.set(key, bar);
      refreshNearestBar();
      return () => {
        if (bars.current.get(key) === bar) {
          bars.current.delete(key);
          refreshNearestBar();
        }
      };
    },
    [refreshNearestBar]
  );
  const registerPoint = useCallback((id: string, x: number, y: number) => {
    setPoints(current => new Map(current).set(id, { x, y }));
    return () =>
      setPoints(current => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
  }, []);
  const [categoryAxisKeys, setCategoryAxisKeys] = useState<
    ReadonlyMap<string, ChartDataKey>
  >(() => new Map());
  const registerCategoryAxis = useCallback(
    (axis: 'x' | 'y', id: string | number, dataKey: ChartDataKey) => {
      const key = chartAxisKey(axis, id);
      setCategoryAxisKeys(current =>
        current.get(key) === dataKey
          ? current
          : new Map(current).set(key, dataKey)
      );
      return () =>
        setCategoryAxisKeys(current => {
          if (current.get(key) !== dataKey) return current;
          const next = new Map(current);
          next.delete(key);
          return next;
        });
    },
    []
  );
  useEffect(() => {
    // A new active sample moves the registered dots; re-evaluate the latest
    // pointer position even if its previous nearest series was unchanged.
    setPointerPosition(latestPointerPosition.current);
  }, [points]);
  function trackPointer(event: PointerEvent<HTMLElement>) {
    setMouseHover(event.pointerType === 'mouse');
    const svg = event.currentTarget.querySelector('svg[role="application"]');
    if (
      !(svg instanceof SVGSVGElement) ||
      !(event.target instanceof Node) ||
      !svg.contains(event.target)
    ) {
      resetPointerInspection();
      return false;
    }
    setSuppressPlotInspection(false);
    setIsPointerInspection(true);
    // Direct-hit series do not need pointer coordinates to select a sample.
    if (
      bars.current.size === 0 &&
      hoveredSeriesId != null &&
      !points.has(hoveredSeriesId)
    ) {
      latestPointerPosition.current = null;
      setPointerPosition(null);
      setNearestBar(null);
      return true;
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) return true;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse()
    );
    const nextPosition = { x: point.x, y: point.y };
    latestPointerPosition.current = nextPosition;
    const selected = findNearestBar(bars.current, nextPosition, layout);
    setNearestBar(selected);
    setPointerPosition(current => {
      const currentBar = findNearestBar(bars.current, current, layout);
      const currentTarget = barCloserThanPoints(currentBar, points, current)
        ? currentBar
        : findNearestSeriesId(hoveredSeriesId, points, current);
      const nextTarget = barCloserThanPoints(selected, points, nextPosition)
        ? selected
        : findNearestSeriesId(hoveredSeriesId, points, nextPosition);
      return currentTarget === nextTarget ? current : nextPosition;
    });
    return true;
  }
  function resetPointerInspection() {
    setMouseHover(false);
    cursor.reset();
    setIsPointerInspection(false);
    setHoveredSeriesId(null);
    latestPointerPosition.current = null;
    setPointerPosition(null);
    setNearestBar(null);
  }
  const activeBar = barCloserThanPoints(nearestBar, points, pointerPosition)
    ? nearestBar
    : null;
  const activeSeriesId =
    activeBar?.seriesId ??
    findNearestSeriesId(hoveredSeriesId, points, pointerPosition);
  const [seriesIds, setSeriesIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const registerSeries = useCallback((id: string) => {
    setSeriesIds(current => new Set(current).add(id));
    return () => {
      setSeriesIds(current => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    };
  }, []);
  const [legendHoveredKey, setLegendHoveredKey] = useState<string | null>(null);
  const [suppressPlotInspection, setSuppressPlotInspection] = useState(false);
  const [focusedLegendKeys, setFocusedLegendKeys] =
    useState<ReadonlySet<string> | null>(null);
  const [barAxisByKey, setBarAxisByKey] = useState<
    ReadonlyMap<string, string | number>
  >(() => new Map());
  const registerBarAxis = useCallback(
    (key: string, axisId: string | number) => {
      setBarAxisByKey(current => {
        if (current.get(key) === axisId) return current;
        return new Map(current).set(key, axisId);
      });
      return () =>
        setBarAxisByKey(current => {
          if (current.get(key) !== axisId) return current;
          const next = new Map(current);
          next.delete(key);
          return next;
        });
    },
    []
  );
  const valueAxis = layout === 'vertical' ? 'x' : 'y';
  const [fullAxisSpace, setFullAxisSpace] = useState<{
    left: number;
    right: number;
  } | null>(null);
  const trackPlotOffsets = useCallback(
    (left: number, right: number) => {
      if (focusedLegendKeys) return;
      setFullAxisSpace(current =>
        current?.left === left && current.right === right
          ? current
          : { left, right }
      );
    },
    [focusedLegendKeys]
  );
  const axisLayout = inspectAxisLayout(children);
  const nativeKeyCounts = countNativeSeriesKeys(children);
  const visibleBarAxisIds = collectVisibleNativeBarAxisIds(
    children,
    focusedLegendKeys,
    valueAxis,
    nativeKeyCounts
  );
  for (const [key, axisId] of barAxisByKey) {
    if (!focusedLegendKeys || focusedLegendKeys.has(key))
      visibleBarAxisIds.add(axisId);
  }
  const reconcileLegendKeys = useCallback((keys: readonly string[]) => {
    setFocusedLegendKeys(current => reconcileLegendFocus(current, keys));
  }, []);
  const toggleLegendKey = useCallback(
    (key: string, keys: readonly string[]) => {
      setSuppressPlotInspection(true);
      setFocusedLegendKeys(current => toggleLegendFocus(current, key, keys));
    },
    []
  );
  const registration = useMemo(
    () => ({
      registerPoint,
      registerBar,
      registerSeries,
      registerCategoryAxis,
      setHoveredSeriesId,
    }),
    [registerPoint, registerBar, registerSeries, registerCategoryAxis]
  );
  return (
    <ChartCursorChartContext.Provider value={{ cursor, mouseHover }}>
      <ChartLegendInteractionContext.Provider
        value={{
          hoveredKey: legendHoveredKey,
          focusedKeys: focusedLegendKeys,
          suppressPlotInspection,
          hover: key => {
            setLegendHoveredKey(key);
            if (key) setSuppressPlotInspection(true);
          },
          toggle: toggleLegendKey,
          reconcile: reconcileLegendKeys,
          registerBarAxis,
        }}
      >
        <ChartInteractionContext.Provider
          value={{
            isPointerInspection,
            activeSeriesId,
            activePoint:
              activeSeriesId == null ? undefined : points.get(activeSeriesId),
            activeBar,
            getCategoryDataKey: axisId =>
              categoryAxisKeys.get(
                chartAxisKey(layout === 'horizontal' ? 'x' : 'y', axisId)
              ) ?? categoryDataKey(children, layout, axisId),
            seriesCount: seriesIds.size,
          }}
        >
          <section
            className={classNames('altertable-composed-chart', className)}
            aria-label={ariaLabel}
            data-atbl-internal-pointer-focus={hasPointerFocus || undefined}
            onPointerDownCapture={event => {
              setHasPointerFocus(trackPointer(event));
            }}
            onPointerOverCapture={trackPointer}
            onPointerMoveCapture={trackPointer}
            onPointerLeave={event => {
              if (event.pointerType !== 'touch') {
                resetPointerInspection();
              }
            }}
            onKeyDownCapture={() => {
              setHasPointerFocus(false);
              resetPointerInspection();
            }}
            onFocusCapture={event => {
              const svg = event.currentTarget.querySelector(
                'svg[role="application"]'
              );
              if (svg?.contains(event.target)) setSuppressPlotInspection(false);
            }}
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setHasPointerFocus(false);
                resetPointerInspection();
              }
            }}
          >
            <ChartValueFormat.Provider value={valueFormat}>
              <ChartDateAxes data={data}>
                <ChartRegistrationContext.Provider value={registration}>
                  <RechartsComposedChart
                    data-atbl-focus="inset"
                    {...props}
                    data={data}
                    width={width}
                    height={height}
                    responsive={responsive}
                    layout={layout}
                    aria-label={ariaLabel}
                  >
                    {valueAxis === 'y' &&
                      axisLayout.autoYAxis &&
                      axisLayout.interactiveLegend && (
                        <PlotOffsets onChange={trackPlotOffsets} />
                      )}
                    {horizontalGrid && !hasAuthoredGrid(children) && (
                      <CartesianGrid />
                    )}
                    {applyNativeLegendInteraction(
                      children,
                      focusedLegendKeys,
                      legendHoveredKey,
                      suppressPlotInspection,
                      valueAxis,
                      visibleBarAxisIds,
                      fullAxisSpace,
                      axisLayout,
                      nativeKeyCounts
                    )}
                  </RechartsComposedChart>
                </ChartRegistrationContext.Provider>
              </ChartDateAxes>
            </ChartValueFormat.Provider>
          </section>
        </ChartInteractionContext.Provider>
      </ChartLegendInteractionContext.Provider>
    </ChartCursorChartContext.Provider>
  );
}

/** Shared themed series and controls; other children retain native Recharts defaults. */
export const ComposedChart = Object.assign(ComposedChartRoot, {
  Dot,
  Area,
  Bar,
  Line,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,
  Cell,
  Label,
  LabelList,
  ErrorBar,
});

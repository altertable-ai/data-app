import { type MetricFormat } from '@altertable/data-app/format';
import {
  Children,
  Fragment,
  isValidElement,
  cloneElement,
  useState,
  useCallback,
  useEffect,
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
  Label,
  LabelList,
  ErrorBar,
} from 'recharts';

import type { HorizontalGridProps } from './chart-data.ts';
import { ChartDateAxes } from './chart-date-axis.tsx';
import {
  ChartInteractionContext,
  type ChartPoint,
} from './chart-interaction.tsx';
import {
  ChartLegendInteractionContext,
  chartLegendSeriesKey,
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

function applyNativeLegendInteraction(
  children: ReactNode,
  focusedKeys: ReadonlySet<string> | null,
  hoveredKey: string | null,
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
          `${path}-${child.key ?? index}`
        ),
      } as { children: ReactNode });
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
    const id =
      series.props.id ??
      (chartLegendSeriesKey(undefined, series.props.dataKey) == null
        ? `atbl-native-${path}-${child.key ?? index}`
        : undefined);
    const key = chartLegendSeriesKey(id, series.props.dataKey)!;
    const excluded = !!(focusedKeys && !focusedKeys.has(key));
    return cloneElement(series, {
      id,
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
    });
  });
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
  const latestPointerPosition = useRef<ChartPoint | null>(null);
  const [points, setPoints] = useState<ReadonlyMap<string, ChartPoint>>(
    () => new Map()
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
    setIsPointerInspection(true);
    // Direct-hit series do not need pointer coordinates to select a sample.
    if (hoveredSeriesId != null && !points.has(hoveredSeriesId)) {
      latestPointerPosition.current = null;
      setPointerPosition(null);
      return true;
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) return true;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse()
    );
    const nextPosition = { x: point.x, y: point.y };
    latestPointerPosition.current = nextPosition;
    setPointerPosition(current =>
      findNearestSeriesId(hoveredSeriesId, points, current) ===
      findNearestSeriesId(hoveredSeriesId, points, nextPosition)
        ? current
        : nextPosition
    );
    return true;
  }
  function resetPointerInspection() {
    setMouseHover(false);
    cursor.reset();
    setIsPointerInspection(false);
    setHoveredSeriesId(null);
    latestPointerPosition.current = null;
    setPointerPosition(null);
  }
  const activeSeriesId = findNearestSeriesId(
    hoveredSeriesId,
    points,
    pointerPosition
  );
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
  const [focusedLegendKeys, setFocusedLegendKeys] =
    useState<ReadonlySet<string> | null>(null);
  const toggleLegendKey = useCallback((key: string) => {
    setFocusedLegendKeys(current => {
      if (!current) return new Set([key]);
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next.size ? next : null;
    });
  }, []);
  return (
    <ChartCursorChartContext.Provider value={{ cursor, mouseHover }}>
      <ChartLegendInteractionContext.Provider
        value={{
          hoveredKey: legendHoveredKey,
          focusedKeys: focusedLegendKeys,
          hover: setLegendHoveredKey,
          toggle: toggleLegendKey,
          showAll: () => setFocusedLegendKeys(null),
        }}
      >
        <ChartInteractionContext.Provider
          value={{
            isPointerInspection,
            activeSeriesId,
            activePoint:
              activeSeriesId == null ? undefined : points.get(activeSeriesId),
            registerPoint,
            setHoveredSeriesId,
            seriesCount: seriesIds.size,
            registerSeries,
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
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setHasPointerFocus(false);
                resetPointerInspection();
              }
            }}
          >
            <ChartValueFormat.Provider value={valueFormat}>
              <ChartDateAxes data={data}>
                <RechartsComposedChart
                  data-atbl-focus="inset"
                  {...props}
                  data={data}
                  width={width}
                  height={height}
                  responsive={responsive}
                  aria-label={ariaLabel}
                >
                  {horizontalGrid && !hasAuthoredGrid(children) && (
                    <CartesianGrid />
                  )}
                  {applyNativeLegendInteraction(
                    children,
                    focusedLegendKeys,
                    legendHoveredKey
                  )}
                </RechartsComposedChart>
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

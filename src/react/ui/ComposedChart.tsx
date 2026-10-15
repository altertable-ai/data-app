import { classNames } from '@/src/react/ui/classNames';
import { ChartDateAxes } from '@/src/react/ui/chart-date-axis';
import {
  useState,
  useCallback,
  type PointerEvent,
  type ComponentProps,
} from 'react';
import {
  ChartInteractionContext,
  type ChartPoint,
} from '@/src/react/ui/chart-interaction';
import { ComposedChartLegend as Legend } from '@/src/react/ui/ComposedChartLegend';
import {
  ComposedChart as RechartsComposedChart,
  ZAxis,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,
  Cell,
  Label,
  LabelList,
  ErrorBar,
} from 'recharts';

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
} from '@/src/react/ui/chart-primitives';

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

export type ComposedChartProps<Row = unknown> = Omit<
  ComponentProps<typeof RechartsComposedChart<Row>>,
  'data' | 'title'
> & {
  /** Displayed rows; series and axes select fields with Recharts dataKey props. */
  data: readonly Row[];
  /** Describes the measures and scope for assistive technology. */
  ariaLabel: string;
};

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
  width = '100%',
  height = 300,
  responsive = true,
  className,
  ...props
}: ComposedChartProps<Row>) {
  const [hasPointerFocus, setHasPointerFocus] = useState(false);
  const [isPointerInspection, setIsPointerInspection] = useState(false);
  const [hoveredSeriesId, setHoveredSeriesId] = useState<string | null>(null);
  const [pointerPosition, setPointerPosition] = useState<ChartPoint | null>(
    null
  );
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
  function trackPointer(event: PointerEvent<HTMLElement>) {
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
      setPointerPosition(null);
      return true;
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) return true;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse()
    );
    setPointerPosition({ x: point.x, y: point.y });
    return true;
  }
  function resetPointerInspection() {
    setIsPointerInspection(false);
    setHoveredSeriesId(null);
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
  return (
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
        <ChartDateAxes data={data}>
          <RechartsComposedChart
            data-atbl-focus="inset"
            {...props}
            data={data}
            width={width}
            height={height}
            responsive={responsive}
            aria-label={ariaLabel}
          />
        </ChartDateAxes>
      </section>
    </ChartInteractionContext.Provider>
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

import { ChartDateAxes } from '@/src/react/ui/chart-date-axis';
import {
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
  type PointerEvent,
  type ComponentProps,
} from 'react';
import { ChartInteraction } from '@/src/react/ui/chart-interaction';
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

function closestSeries(
  hovered: string | null,
  points: ReadonlyMap<string, { x: number; y: number }>,
  position: { x: number; y: number } | null
) {
  let selected = hovered;
  if (position && points.size > 0 && (hovered == null || points.has(hovered))) {
    let distance = Infinity;
    for (const [id, point] of points) {
      const candidate = Math.hypot(point.x - position.x, point.y - position.y);
      if (candidate < distance) {
        distance = candidate;
        selected = id;
      }
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
  const [pointerFocus, setPointerFocus] = useState(false);
  const [pointer, setPointer] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const pointerPosition = useRef<{ x: number; y: number } | null>(null);
  const [nearest, setNearest] = useState<string | null>(null);
  const [points, setPoints] = useState<
    ReadonlyMap<string, { x: number; y: number }>
  >(() => new Map());
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
    setPointer(true);
    const svg = event.currentTarget.querySelector('svg[role="application"]');
    if (!(svg instanceof SVGSVGElement)) return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse()
    );
    pointerPosition.current = { x: point.x, y: point.y };
    setNearest(closestSeries(hovered, points, pointerPosition.current));
  }
  useLayoutEffect(() => {
    setNearest(closestSeries(hovered, points, pointerPosition.current));
  }, [hovered, points]);
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
    <ChartInteraction.Provider
      value={{
        pointer,
        hovered: nearest,
        point: nearest == null ? undefined : points.get(nearest),
        registerPoint,
        setHovered,
        seriesCount: seriesIds.size,
        registerSeries,
      }}
    >
      <section
        className={['altertable-composed-chart', className]
          .filter(Boolean)
          .join(' ')}
        aria-label={ariaLabel}
        data-atbl-internal-pointer-focus={pointerFocus || undefined}
        onPointerDownCapture={event => {
          setPointerFocus(true);
          trackPointer(event);
        }}
        onPointerOverCapture={trackPointer}
        onPointerMoveCapture={trackPointer}
        onPointerLeave={event => {
          if (event.pointerType !== 'touch') {
            setHovered(null);
            pointerPosition.current = null;
            setNearest(null);
          }
        }}
        onKeyDownCapture={() => {
          setPointerFocus(false);
          setPointer(false);
          pointerPosition.current = null;
          setNearest(null);
          setHovered(null);
        }}
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setPointerFocus(false);
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
    </ChartInteraction.Provider>
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

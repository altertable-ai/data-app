import { useDateAxisLabel, useDateAxisBar } from './chart-date-axis.tsx';
export { ChartXAxis } from './chart-date-axis.tsx';
import { formatMetric, formatNumber } from '@altertable/data-app/format';
import {
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  Area,
  Dot,
  type DotProps,
  Bar,
  Rectangle,
  Line,
  Scatter,
  YAxis,
  useYAxisTicks,
  useCartesianChartLayout,
  usePlotArea,
  CartesianGrid,
  Tooltip,
  DefaultTooltipContent,
  type TooltipContentProps,
  type BarProps,
  type BarShapeProps,
  type LineProps,
  type AreaProps,
} from 'recharts';

import {
  ChartInteractionContext,
  ChartSeries,
  useChartSeries,
  isChartSeriesActive,
} from './chart-interaction.tsx';
import {
  ChartLegendInteractionContext,
  chartLegendSeriesKey,
  useChartLegendSeries,
} from './chart-legend-interaction.tsx';
import { ChartValueFormat, axisValueFormatter } from './chart-value-format.ts';
import { chartBarFill } from './chartColor.ts';
import { ChartLegend } from './ChartLegend.tsx';
import { TooltipSurface } from './TooltipSurface.tsx';
const seriesColor = 'var(--atbl-chart-1)';
/** Hollow sample marker shared by standalone and composed series. */
export function ChartDot({
  active = false,
  stroke = seriesColor,
  fill = active ? stroke : 'var(--atbl-surface)',
  r = active ? 4.5 : 3,
  ...props
}: DotProps & { active?: boolean }) {
  return <Dot stroke={stroke} fill={fill} r={r} strokeWidth={2} {...props} />;
}

function NearestChartDot({
  seriesId,
  cx,
  cy,
  stroke,
}: DotProps & { seriesId: string }) {
  const interaction = useContext(ChartInteractionContext);
  const registerPoint = interaction?.registerPoint;
  const legend = useChartLegendSeries(seriesId, undefined);
  useLayoutEffect(() => {
    if (legend.hidden || cx == null || cy == null) return;
    return registerPoint?.(seriesId, cx, cy);
  }, [registerPoint, seriesId, cx, cy, legend.hidden]);
  const active = !legend.hidden && isChartSeriesActive(interaction, seriesId);
  return active ? (
    <ChartDot
      cx={cx}
      cy={cy}
      stroke={stroke}
      active
      style={{ pointerEvents: 'none' }}
    />
  ) : null;
}

/** Shared series defaults; native props override every authored choice. */
function InspectedBarShape({
  seriesId,
  ...props
}: BarShapeProps & { seriesId: string }) {
  const interaction = useContext(ChartInteractionContext);
  const registerBar = interaction?.registerBar;
  const { x, y, width, height, originalDataIndex, value } = props;
  const reading = Array.isArray(value) ? value[1] - value[0] : value;
  useLayoutEffect(() => {
    if (reading === 0 || width <= 0 || height <= 0) return;
    return registerBar?.({
      seriesId,
      index: originalDataIndex,
      x,
      y,
      width,
      height,
    });
  }, [registerBar, seriesId, originalDataIndex, x, y, width, height, reading]);
  const selected =
    interaction?.isPointerInspection &&
    interaction.activeBar?.seriesId === seriesId &&
    interaction.activeBar.index === originalDataIndex;
  return <Rectangle {...props} opacity={selected ? 0.75 : props.opacity} />;
}

export function ChartBar<Row = unknown, Value = number | null>(
  props: BarProps<Row, Value>
) {
  useDateAxisBar(props.xAxisId);
  const series = useChartSeries(props.id);
  const legend = useChartLegendSeries(series.id, props.dataKey);
  const interaction = useContext(ChartLegendInteractionContext);
  const layout = useCartesianChartLayout();
  const registerBarAxis = interaction?.registerBarAxis;
  const key = chartLegendSeriesKey(series.id, props.dataKey);
  const axisId =
    layout === 'vertical' ? (props.xAxisId ?? 0) : (props.yAxisId ?? 0);
  const inspectStack =
    props.stackId != null && props.shape == null && props.activeBar == null;
  const inspectedShape = useCallback(
    (shapeProps: BarShapeProps) => (
      <InspectedBarShape {...shapeProps} seriesId={series.id} />
    ),
    [series.id]
  );
  useLayoutEffect(
    () => (key && !props.hide ? registerBarAxis?.(key, axisId) : undefined),
    [registerBarAxis, key, axisId, props.hide]
  );
  return (
    <ChartSeries id={series.id}>
      <Bar<Row, Value>
        fill={chartBarFill}
        radius={props.stackId == null ? [5, 5, 0, 0] : 0}
        maxBarSize={30}
        activeBar={
          inspectStack ? false : series.active ? { opacity: 0.75 } : false
        }
        isAnimationActive={false}
        {...props}
        shape={inspectStack ? inspectedShape : props.shape}
        id={series.id}
        hide={legend.hidden || props.hide}
        opacity={legend.hidden ? 0 : legend.dimmed ? 0.2 : props.opacity}
        style={{
          ...props.style,
          pointerEvents: legend.hidden ? 'none' : props.style?.pointerEvents,
        }}
      />
    </ChartSeries>
  );
}

/** Sample dots are opt-in with dot=true.
 * activeDot independently controls the hovered point. Native dot props and renderers remain available. */
export function ChartLine<Row = unknown, Value = number | null>({
  stroke = seriesColor,
  dot = false,
  activeDot,
  ...props
}: LineProps<Row, Value>) {
  const series = useChartSeries(props.id);
  const legend = useChartLegendSeries(series.id, props.dataKey);
  return (
    <ChartSeries id={series.id}>
      <Line<Row, Value>
        type="linear"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        dot={
          legend.hidden
            ? false
            : dot === true
              ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} />
              : dot
        }
        activeDot={
          legend.hidden || legend.inspectingLegend
            ? false
            : activeDot === undefined || activeDot === true
              ? ({ cx, cy }) => (
                  <NearestChartDot
                    seriesId={series.id}
                    cx={cx}
                    cy={cy}
                    stroke={stroke}
                  />
                )
              : activeDot
        }
        isAnimationActive={false}
        {...props}
        id={series.id}
        hide={legend.hidden || props.hide}
        opacity={legend.hidden ? 0 : legend.dimmed ? 0.2 : props.opacity}
        style={{
          ...props.style,
          pointerEvents: legend.hidden ? 'none' : props.style?.pointerEvents,
        }}
      />
    </ChartSeries>
  );
}

/** Filled series with the same sample-dot and activeDot options as ChartLine. */
export function ChartArea<Row = unknown, Value = number | null>({
  stroke = seriesColor,
  dot = false,
  activeDot,
  ...props
}: AreaProps<Row, Value>) {
  const series = useChartSeries(props.id);
  const legend = useChartLegendSeries(series.id, props.dataKey);
  return (
    <ChartSeries id={series.id}>
      <Area<Row, Value>
        legendType="square"
        type="linear"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={stroke}
        fillOpacity={0.14}
        dot={
          legend.hidden
            ? false
            : dot === true
              ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} />
              : dot
        }
        activeDot={
          legend.hidden || legend.inspectingLegend
            ? false
            : activeDot === undefined || activeDot === true
              ? ({ cx, cy }) => (
                  <NearestChartDot
                    seriesId={series.id}
                    cx={cx}
                    cy={cy}
                    stroke={stroke}
                  />
                )
              : activeDot
        }
        isAnimationActive={false}
        {...props}
        id={series.id}
        hide={legend.hidden || props.hide}
        opacity={legend.hidden ? 0 : legend.dimmed ? 0.2 : props.opacity}
        style={{
          ...props.style,
          pointerEvents: legend.hidden ? 'none' : props.style?.pointerEvents,
        }}
      />
    </ChartSeries>
  );
}

export function ChartScatter<Row = unknown, Value = number>(
  props: ComponentProps<typeof Scatter<Row, Value>>
) {
  const series = useChartSeries(props.id);
  const legend = useChartLegendSeries(series.id, props.dataKey);
  return (
    <ChartSeries id={series.id}>
      <Scatter<Row, Value>
        fill={seriesColor}
        isAnimationActive={false}
        {...props}
        id={series.id}
        hide={legend.hidden || props.hide}
        opacity={legend.hidden ? 0 : legend.dimmed ? 0.2 : props.opacity}
        style={{
          ...props.style,
          pointerEvents: legend.hidden ? 'none' : props.style?.pointerEvents,
        }}
      />
    </ChartSeries>
  );
}

export function ChartYAxis<Row = unknown, Value = number>(
  props: ComponentProps<typeof YAxis<Row, Value>>
) {
  const format = useContext(ChartValueFormat);
  const ticks = useYAxisTicks(props.yAxisId);
  const formatter = axisValueFormatter(
    (ticks ?? [])
      .map(tick => tick.value)
      .filter((value): value is number => typeof value === 'number'),
    format
  );
  return (
    <YAxis<Row, Value>
      width="auto"
      stroke="var(--atbl-muted)"
      tickFormatter={formatter}
      tickLine={false}
      axisLine={false}
      tick={{ fontSize: 'var(--atbl-type-meta-size)' }}
      {...props}
    />
  );
}

export function ChartGrid(props: ComponentProps<typeof CartesianGrid>) {
  return (
    <CartesianGrid stroke="var(--atbl-border)" vertical={false} {...props} />
  );
}

export function ChartTooltipContent(
  props: ComponentProps<typeof DefaultTooltipContent> & { active?: boolean }
) {
  const valueFormat = useContext(ChartValueFormat);
  function formatValue(value: number) {
    return valueFormat ? formatMetric(value, valueFormat) : formatNumber(value);
  }
  if (!props.active || !props.payload?.length) return null;
  return (
    <TooltipSurface data-variant="chart" role="tooltip">
      <DefaultTooltipContent
        {...props}
        separator=""
        payload={props.payload?.map(entry => ({
          ...entry,
          unit: undefined,
          formatter: (value, name, _item, index, payload) => {
            const formatter = entry.formatter ?? props.formatter;
            const formatted = formatter
              ? formatter(value, name, entry, index, props.payload ?? payload)
              : Array.isArray(value)
                ? value
                    .map(item =>
                      typeof item === 'number' ? formatValue(item) : item
                    )
                    .join(' ~ ')
                : typeof value === 'number'
                  ? formatValue(value)
                  : value;
            if (formatted == null) return null;
            const [displayValue, displayName] = Array.isArray(formatted)
              ? formatted
              : [formatted, name];
            return [
              <span
                key={entry.graphicalItemId}
                className="altertable-chart-tooltip-row"
              >
                <ChartLegend.Marker
                  kind="square"
                  className="altertable-chart-tooltip-marker"
                  color={
                    entry.color ??
                    entry.stroke ??
                    entry.fill ??
                    'var(--atbl-chart-1)'
                  }
                />
                <span className="altertable-chart-tooltip-reading">
                  {displayName}
                  {displayName !== undefined && displayName !== ''
                    ? (props.separator ?? ' : ')
                    : ''}
                  {displayValue}
                  {entry.unit}
                </span>
              </span>,
              '',
            ];
          },
        }))}
        contentStyle={{
          margin: 0,
          padding: 0,
          background: 'transparent',
          border: 0,
          whiteSpace: 'normal',
          ...props.contentStyle,
        }}
        labelStyle={{
          color: 'var(--atbl-text)',
          fontSize: 'var(--atbl-type-body-size)',
          fontWeight: 650,
          lineHeight: 1.2,
          ...props.labelStyle,
        }}
        itemStyle={{
          color: 'var(--atbl-text)',
          paddingTop: 2,
          paddingBottom: 0,
          ...props.itemStyle,
        }}
      />
    </TooltipSurface>
  );
}

function MeasuredTooltipContent({
  children,
  onMeasure,
}: {
  children: ReactNode;
  onMeasure: (width: number, height: number) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const target = element;
    function measure() {
      onMeasure(target.offsetWidth, target.offsetHeight);
    }
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onMeasure]);
  return (
    <span ref={ref} style={{ display: 'block' }}>
      {children}
    </span>
  );
}

function barTooltipPosition(
  bar: { x: number; y: number; width: number; height: number },
  plot: { x: number; y: number; width: number; height: number },
  size: { width: number; height: number }
) {
  const gap = 10;
  const right = bar.x + bar.width + gap;
  const left = bar.x - size.width - gap;
  const plotRight = plot.x + plot.width;
  const x =
    right + size.width <= plotRight
      ? right
      : left >= plot.x
        ? left
        : Math.max(plot.x, Math.min(right, plotRight - size.width));
  const y = Math.max(
    plot.y,
    Math.min(
      bar.y + bar.height / 2 - size.height / 2,
      plot.y + plot.height - size.height
    )
  );
  return { x, y };
}

/** Uses the same surface as single-series inspection; Recharts owns interaction. */
export function ChartTooltip(props: ComponentProps<typeof Tooltip>) {
  const dateLabel = useDateAxisLabel(props.axisId);
  const interaction = useContext(ChartInteractionContext);
  const legendInteraction = useContext(ChartLegendInteractionContext);
  const plot = usePlotArea();
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });
  const measureTooltip = useCallback((width: number, height: number) => {
    setTooltipSize(current =>
      current.width === width && current.height === height
        ? current
        : { width, height }
    );
  }, []);
  const { content: authoredContent, ...tooltipProps } = props;
  const activeBar = interaction?.isPointerInspection
    ? interaction.activeBar
    : null;
  const position =
    activeBar && plot && tooltipSize.width && tooltipSize.height
      ? barTooltipPosition(activeBar, plot, tooltipSize)
      : interaction?.isPointerInspection && interaction.activePoint
        ? { y: interaction.activePoint.y }
        : undefined;
  return (
    <Tooltip
      labelFormatter={dateLabel}
      position={position}
      cursor={false}
      isAnimationActive={false}
      {...tooltipProps}
      content={content => {
        if (legendInteraction?.suppressPlotInspection) return null;
        const activeBar = interaction?.isPointerInspection
          ? interaction.activeBar
          : null;
        const selectedRow = activeBar
          ? interaction?.data[activeBar.index]
          : undefined;
        const payload = (
          interaction?.isPointerInspection &&
          interaction.seriesCount !== 1 &&
          props.shared !== true
            ? content.payload.filter(
                entry => entry.graphicalItemId === interaction.activeSeriesId
              )
            : content.payload
        ).filter(entry => {
          if (!legendInteraction?.focusedKeys) return true;
          const key = chartLegendSeriesKey(
            entry.graphicalItemId,
            entry.dataKey
          );
          return key == null || legendInteraction.focusedKeys.has(key);
        });
        const selectedPayload =
          selectedRow == null
            ? payload
            : payload.map(entry => {
                const key = entry.dataKey;
                const value =
                  typeof key === 'function'
                    ? key(selectedRow)
                    : key == null
                      ? entry.value
                      : (selectedRow as Record<string | number, unknown>)[key];
                return {
                  ...entry,
                  payload: selectedRow,
                  value: value as typeof entry.value,
                };
              });
        const categoryKey = interaction?.categoryDataKey;
        const label =
          selectedRow == null || categoryKey == null
            ? content.label
            : typeof categoryKey === 'function'
              ? categoryKey(selectedRow)
              : (selectedRow as Record<string, unknown>)[categoryKey];
        const filtered: TooltipContentProps = {
          ...content,
          payload: selectedPayload,
          label: label as string | number | undefined,
        };
        const rendered =
          typeof authoredContent === 'function' ? (
            authoredContent(filtered)
          ) : isValidElement<TooltipContentProps>(authoredContent) ? (
            cloneElement(authoredContent, filtered)
          ) : (
            <ChartTooltipContent {...filtered} />
          );
        return (
          <MeasuredTooltipContent onMeasure={measureTooltip}>
            {rendered}
          </MeasuredTooltipContent>
        );
      }}
    />
  );
}

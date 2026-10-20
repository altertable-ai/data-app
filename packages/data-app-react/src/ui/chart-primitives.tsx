import { useDateAxisLabel } from './chart-date-axis.tsx';
export { ChartXAxis } from './chart-date-axis.tsx';
import { formatNumber } from '@altertable/data-app/format';
import { useContext, useLayoutEffect, type ComponentProps } from 'react';
import {
  Area,
  Dot,
  type DotProps,
  Bar,
  Line,
  Scatter,
  YAxis,
  CartesianGrid,
  Tooltip,
  DefaultTooltipContent,
  type BarProps,
  type LineProps,
  type AreaProps,
} from 'recharts';

import {
  ChartInteractionContext,
  ChartSeries,
  useChartSeries,
  isChartSeriesActive,
} from './chart-interaction.tsx';
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
  useLayoutEffect(() => {
    if (cx == null || cy == null) return;
    return registerPoint?.(seriesId, cx, cy);
  }, [registerPoint, seriesId, cx, cy]);
  const active = isChartSeriesActive(interaction, seriesId);
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
export function ChartBar<Row = unknown, Value = number | null>(
  props: BarProps<Row, Value>
) {
  const series = useChartSeries(props.id);
  return (
    <ChartSeries id={series.id}>
      <Bar<Row, Value>
        fill={chartBarFill}
        radius={props.stackId == null ? [5, 5, 0, 0] : 0}
        maxBarSize={30}
        activeBar={series.active ? { opacity: 0.75 } : false}
        isAnimationActive={false}
        {...props}
        id={series.id}
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
  return (
    <ChartSeries id={series.id}>
      <Line<Row, Value>
        type="linear"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        dot={
          dot === true
            ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} />
            : dot
        }
        activeDot={
          activeDot === undefined || activeDot === true
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
          dot === true
            ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} />
            : dot
        }
        activeDot={
          activeDot === undefined || activeDot === true
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
      />
    </ChartSeries>
  );
}

export function ChartScatter<Row = unknown, Value = number>(
  props: ComponentProps<typeof Scatter<Row, Value>>
) {
  const series = useChartSeries(props.id);
  return (
    <ChartSeries id={series.id}>
      <Scatter<Row, Value>
        fill={seriesColor}
        isAnimationActive={false}
        {...props}
        id={series.id}
      />
    </ChartSeries>
  );
}

export function ChartYAxis<Row = unknown, Value = number>(
  props: ComponentProps<typeof YAxis<Row, Value>>
) {
  return (
    <YAxis<Row, Value>
      width="auto"
      stroke="var(--atbl-muted)"
      tickFormatter={value =>
        typeof value === 'number' ? formatNumber(value) : String(value)
      }
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
                      typeof item === 'number' ? formatNumber(item) : item
                    )
                    .join(' ~ ')
                : typeof value === 'number'
                  ? formatNumber(value)
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

/** Uses the same surface as single-series inspection; Recharts owns interaction. */
export function ChartTooltip(props: ComponentProps<typeof Tooltip>) {
  const dateLabel = useDateAxisLabel(props.axisId);
  const interaction = useContext(ChartInteractionContext);
  return (
    <Tooltip
      labelFormatter={dateLabel}
      content={content => (
        <ChartTooltipContent
          {...content}
          payload={
            interaction?.isPointerInspection &&
            interaction.seriesCount !== 1 &&
            props.shared !== true
              ? content.payload.filter(
                  entry => entry.graphicalItemId === interaction.activeSeriesId
                )
              : content.payload
          }
        />
      )}
      position={
        interaction?.isPointerInspection && interaction.activePoint
          ? { y: interaction.activePoint.y }
          : undefined
      }
      cursor={false}
      isAnimationActive={false}
      {...props}
    />
  );
}

import type { ComponentProps } from 'react';
import {
  Area,
  Dot,
  type DotProps,
  Bar,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  DefaultTooltipContent,
  type BarProps,
  type LineProps,
  type AreaProps,
} from 'recharts';
import { TooltipSurface } from '@/src/react/ui/TooltipSurface';

export const chartBarFill =
  'var(--atbl-chart-fill, color-mix(in srgb, var(--atbl-accent) 75%, var(--atbl-surface)))';
const accent = 'var(--atbl-accent)';
/** Hollow sample marker shared by standalone and composed series. */
export function ChartDot({
  active = false,
  stroke = accent,
  fill = active ? stroke : 'var(--atbl-surface)',
  r = active ? 4.5 : 3,
  ...props
}: DotProps & { active?: boolean }) {
  return <Dot stroke={stroke} fill={fill} r={r} strokeWidth={2} {...props} />;
}

/** Shared series defaults; native props override every authored choice. */
export function ChartBar<Row = unknown, Value = number | null>(
  props: BarProps<Row, Value>
) {
  return (
    <Bar<Row, Value>
      fill={chartBarFill}
      radius={[5, 5, 0, 0]}
      maxBarSize={30}
      activeBar={{ fill: accent }}
      isAnimationActive={false}
      {...props}
    />
  );
}

export function ChartLine<Row = unknown, Value = number | null>({
  stroke = accent,
  dot,
  activeDot,
  ...props
}: LineProps<Row, Value>) {
  return (
    <Line<Row, Value>
      type="linear"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dot={
        dot === undefined || dot === true
          ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} />
          : dot
      }
      activeDot={
        activeDot === undefined || activeDot === true
          ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} active />
          : activeDot
      }
      isAnimationActive={false}
      {...props}
    />
  );
}

export function ChartArea<Row = unknown, Value = number | null>({
  stroke = accent,
  dot,
  activeDot,
  ...props
}: AreaProps<Row, Value>) {
  return (
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
        dot === undefined || dot === true
          ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} />
          : dot
      }
      activeDot={
        activeDot === undefined || activeDot === true
          ? ({ cx, cy }) => <ChartDot cx={cx} cy={cy} stroke={stroke} active />
          : activeDot
      }
      isAnimationActive={false}
      {...props}
    />
  );
}

export function ChartScatter<Row = unknown, Value = number>(
  props: ComponentProps<typeof Scatter<Row, Value>>
) {
  return (
    <Scatter<Row, Value> fill={accent} isAnimationActive={false} {...props} />
  );
}

export function ChartXAxis<Row = unknown, Value = string | number>(
  props: ComponentProps<typeof XAxis<Row, Value>>
) {
  return (
    <XAxis<Row, Value>
      stroke="var(--atbl-muted)"
      tickLine={false}
      axisLine={{ stroke: 'var(--atbl-border)' }}
      tick={{ fontSize: 'var(--atbl-type-meta-size)' }}
      {...props}
    />
  );
}

export function ChartYAxis<Row = unknown, Value = number>(
  props: ComponentProps<typeof YAxis<Row, Value>>
) {
  return (
    <YAxis<Row, Value>
      stroke="var(--atbl-muted)"
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

function ChartTooltipContent(
  props: ComponentProps<typeof DefaultTooltipContent> & { active?: boolean }
) {
  if (!props.active) return null;
  return (
    <TooltipSurface data-variant="chart" role="tooltip">
      <DefaultTooltipContent
        {...props}
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
        itemStyle={{ paddingTop: 2, paddingBottom: 0, ...props.itemStyle }}
      />
    </TooltipSurface>
  );
}

/** Uses the same surface as single-series inspection; Recharts owns interaction. */
export function ChartTooltip(props: ComponentProps<typeof Tooltip>) {
  return (
    <Tooltip
      content={<ChartTooltipContent />}
      cursor={false}
      isAnimationActive={false}
      {...props}
    />
  );
}

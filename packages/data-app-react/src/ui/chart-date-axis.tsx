import { formatNumber } from '@altertable/data-app/format';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  XAxis,
  useActiveTooltipLabel,
  useIsTooltipActive,
  useXAxisScale,
  usePlotArea,
  type XAxisTickContentProps,
} from 'recharts';

import { chartTimestamp, timeModel, timeTicks } from './chart-time.ts';
import { ChartCursorChartContext } from './use-chart-cursor-group.tsx';

type LabelFormatter = (value: unknown) => string;
type ChartDateAxesApi = {
  data: readonly unknown[];
  barAxes: ReadonlyMap<string | number, number>;
  registerBar: (id: string | number) => () => void;
  formatters: ReadonlyMap<string | number, LabelFormatter>;
  register: (id: string | number, formatter: LabelFormatter) => () => void;
};
const ChartDateAxesContext = createContext<ChartDateAxesApi | null>(null);

export function ChartDateAxes({
  data,
  children,
}: {
  data: readonly unknown[];
  children: ReactNode;
}) {
  const [formatters, setFormatters] = useState<
    ReadonlyMap<string | number, LabelFormatter>
  >(() => new Map());
  const register = useCallback(
    (id: string | number, formatter: LabelFormatter) => {
      setFormatters(current => new Map(current).set(id, formatter));
      return () =>
        setFormatters(current => {
          const next = new Map(current);
          next.delete(id);
          return next;
        });
    },
    []
  );
  const [barAxes, setBarAxes] = useState<ReadonlyMap<string | number, number>>(
    () => new Map()
  );
  const registerBar = useCallback((id: string | number) => {
    setBarAxes(current => new Map(current).set(id, (current.get(id) ?? 0) + 1));
    return () =>
      setBarAxes(current => {
        const next = new Map(current);
        const count = (next.get(id) ?? 1) - 1;
        if (count) next.set(id, count);
        else next.delete(id);
        return next;
      });
  }, []);
  return (
    <ChartDateAxesContext.Provider
      value={{ data, formatters, register, barAxes, registerBar }}
    >
      {children}
    </ChartDateAxesContext.Provider>
  );
}
export function useDateAxisBar(id: string | number = 0) {
  const registerBar = useContext(ChartDateAxesContext)?.registerBar;
  useLayoutEffect(() => registerBar?.(id), [registerBar, id]);
}
export function useDateAxisLabel(id: string | number = 0) {
  return useContext(ChartDateAxesContext)?.formatters.get(id);
}
function field(row: unknown, key: string | number): unknown {
  if (row == null || typeof row !== 'object') return undefined;
  if (key in row) return (row as Record<string | number, unknown>)[key];
  return String(key)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value != null && typeof value === 'object'
          ? (value as Record<string, unknown>)[part]
          : undefined,
      row
    );
}

const xAxisDefaults = {
  interval: 'preserveStartEnd' as const,
  stroke: 'var(--atbl-muted)',
  tickFormatter: (value: unknown) =>
    typeof value === 'number' ? formatNumber(value) : String(value),
  tickLine: false,
  axisLine: { stroke: 'var(--atbl-border)' },
  tick: { fontSize: 'var(--atbl-type-meta-size)' },
};

function LinkedTimeCursor({
  times,
  axisId,
}: {
  times: readonly number[];
  axisId: string | number;
}) {
  const context = useContext(ChartCursorChartContext);
  const label = useActiveTooltipLabel();
  const active = useIsTooltipActive();
  const scale = useXAxisScale(axisId);
  const plot = usePlotArea();
  const mouseHover = context?.mouseHover;
  const setTime = context?.cursor.setTime;
  const reset = context?.cursor.reset;
  useEffect(() => {
    if (!mouseHover || !active) {
      reset?.();
    } else {
      const time = chartTimestamp(label, true);
      if (time != null && times.includes(time)) setTime?.(time);
    }
  }, [mouseHover, active, label, times, setTime, reset]);
  const time = context?.cursor.time;
  if (time == null || !times.includes(time)) return null;
  const x = scale?.(time);
  if (
    !plot ||
    x == null ||
    !Number.isFinite(x) ||
    x < plot.x ||
    x > plot.x + plot.width
  )
    return null;
  return (
    <line
      aria-hidden="true"
      x1={x}
      x2={x}
      y1={plot.y}
      y2={plot.y + plot.height}
      stroke="var(--atbl-muted)"
      strokeOpacity={0.3}
      pointerEvents="none"
      data-atbl-internal-linked-cursor="true"
    />
  );
}

/**
 * Infers temporal input from ISO dates, zoned ISO timestamps, and Date values.
 * Use scale="utc" for epoch milliseconds or type="category" for date-like categories.
 * Explicit tick formatters and tick lists retain authored axis behavior.
 */
export function ChartXAxis<Row = unknown, Value = string | number | Date>(
  props: ComponentProps<typeof XAxis<Row, Value>>
) {
  const context = useContext(ChartDateAxesContext);
  const plot = usePlotArea();
  const data = context?.data;
  const { dataKey, ...axisProps } = props;
  const numeric = props.scale === 'utc';
  const enabled =
    numeric ||
    (props.type == null &&
      props.scale == null &&
      props.tickFormatter == null &&
      props.ticks == null);
  const model = useMemo(() => {
    if (!enabled || !data?.length || dataKey == null) return null;
    return timeModel(
      data.map(row =>
        typeof dataKey === 'function'
          ? dataKey(row as Row)
          : field(row, dataKey)
      ),
      numeric
    );
  }, [data, dataKey, enabled, numeric]);
  const cursorModel = useMemo(() => {
    if (!data?.length || dataKey == null || props.type === 'category')
      return null;
    if (props.scale !== 'utc' && props.scale !== 'time') return null;
    return timeModel(
      data.map(row =>
        typeof dataKey === 'function'
          ? dataKey(row as Row)
          : field(row, dataKey)
      ),
      props.scale === 'utc' || props.scale === 'time'
    );
  }, [data, dataKey, props.type, props.scale]);
  const register = context?.register;
  const id = props.xAxisId ?? 0;
  useEffect(
    () => (model ? register?.(id, model.tooltip) : undefined),
    [register, id, model]
  );
  if (!model || dataKey == null) {
    return (
      <>
        <XAxis<Row, Value> {...xAxisDefaults} {...props} />
        {cursorModel && (
          <LinkedTimeCursor times={cursorModel.times} axisId={id} />
        )}
      </>
    );
  }
  const automaticTicks =
    props.ticks == null && props.tickFormatter == null
      ? timeTicks(model, plot?.width ?? 400)
      : null;
  return (
    <>
      <XAxis<Row, number | null>
        {...xAxisDefaults}
        scale="utc"
        domain={
          model.start === model.end || context?.barAxes.has(id)
            ? [
                model.start - model.minimumInterval / 2,
                model.end + model.minimumInterval / 2,
              ]
            : [model.start, model.end]
        }
        ticks={automaticTicks?.ticks}
        interval={automaticTicks ? 0 : undefined}
        height={48}
        tickFormatter={model.tooltip}
        tick={
          automaticTicks
            ? ({ x, y, payload, index }: XAxisTickContentProps) => {
                const label = automaticTicks.label(
                  Number(payload.value),
                  index
                );
                return (
                  <text
                    x={x}
                    y={Number(y) + 5}
                    fill="var(--atbl-muted)"
                    fontSize="var(--atbl-type-meta-size)"
                    textAnchor={
                      index === 0
                        ? 'start'
                        : index === automaticTicks.ticks.length - 1
                          ? 'end'
                          : 'middle'
                    }
                  >
                    <tspan x={x} dy="0.8em">
                      {label.main}
                    </tspan>
                    {label.context && (
                      <tspan x={x} dy="1.4em">
                        {label.context}
                      </tspan>
                    )}
                  </text>
                );
              }
            : xAxisDefaults.tick
        }
        {...axisProps}
        type="number"
        dataKey={row =>
          chartTimestamp(
            typeof dataKey === 'function' ? dataKey(row) : field(row, dataKey),
            numeric
          )
        }
      />
      <LinkedTimeCursor times={model.times} axisId={id} />
    </>
  );
}

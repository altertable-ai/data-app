import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { XAxis, usePlotArea, type XAxisTickContentProps } from 'recharts';
import { chartTimestamp, timeModel, timeTicks } from './chart-time.ts';
import { formatNumber } from '@altertable/data-app/format';

type LabelFormatter = (value: unknown) => string;
type ChartDateAxesApi = {
  data: readonly unknown[];
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
  return (
    <ChartDateAxesContext.Provider value={{ data, formatters, register }}>
      {children}
    </ChartDateAxesContext.Provider>
  );
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
  stroke: 'var(--atbl-muted)',
  tickFormatter: (value: unknown) =>
    typeof value === 'number' ? formatNumber(value) : String(value),
  tickLine: false,
  axisLine: { stroke: 'var(--atbl-border)' },
  tick: { fontSize: 'var(--atbl-type-meta-size)' },
};

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
  const register = context?.register;
  const id = props.xAxisId ?? 0;
  useEffect(
    () => (model ? register?.(id, model.tooltip) : undefined),
    [register, id, model]
  );
  if (!model || dataKey == null) {
    return <XAxis<Row, Value> {...xAxisDefaults} {...props} />;
  }
  const automaticTicks =
    props.ticks == null && props.tickFormatter == null
      ? timeTicks(model, plot?.width ?? 400)
      : null;
  return (
    <XAxis<Row, number | null>
      {...xAxisDefaults}
      scale="utc"
      domain={
        model.start === model.end
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
              const label = automaticTicks.label(Number(payload.value), index);
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
  );
}

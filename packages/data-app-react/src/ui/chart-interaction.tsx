import {
  createContext,
  useContext,
  useId,
  useEffect,
  type ReactNode,
} from 'react';

/** Coordinates in the chart SVG, shared by pointer tracking and active samples. */
export type ChartPoint = { x: number; y: number };
export type ChartBarPoint = ChartPoint & {
  width: number;
  height: number;
  index: number;
  seriesId: string;
  payload: unknown;
};
export type ChartDataKey = string | number | ((row: unknown) => unknown);
export type ChartAxis = 'x' | 'y';

export function chartAxisKey(axis: ChartAxis, id: string | number) {
  return `${axis}:${typeof id}:${id}`;
}

type ChartInteractionApi = {
  isPointerInspection: boolean;
  activePoint: ChartPoint | undefined;
  seriesCount: number;
  activeBar: ChartBarPoint | null;
  getCategoryDataKey: (axisId: string | number) => ChartDataKey | undefined;
  activeSeriesId: string | null;
};

type ChartRegistrationApi = {
  /** Line and area series register the sample at the current inspection position. */
  registerPoint: (id: string, x: number, y: number) => () => void;
  registerBar: (bar: ChartBarPoint) => () => void;
  registerSeries: (id: string) => () => void;
  registerCategoryAxis: (
    axis: ChartAxis,
    id: string | number,
    dataKey: ChartDataKey
  ) => () => void;
  setHoveredSeriesId: (id: string | null) => void;
};

export const ChartInteractionContext =
  createContext<ChartInteractionApi | null>(null);
export const ChartRegistrationContext =
  createContext<ChartRegistrationApi | null>(null);

export function isChartSeriesActive(
  interaction: ChartInteractionApi | null,
  seriesId: string
) {
  return (
    !interaction?.isPointerInspection ||
    interaction.seriesCount === 1 ||
    interaction.activeSeriesId === seriesId
  );
}

export function useChartSeries(id?: string) {
  const generatedId = useId();
  const interaction = useContext(ChartInteractionContext);
  const registration = useContext(ChartRegistrationContext);
  const seriesId = id ?? generatedId;
  const registerSeries = registration?.registerSeries;
  useEffect(() => registerSeries?.(seriesId), [registerSeries, seriesId]);
  return {
    id: seriesId,
    active: isChartSeriesActive(interaction, seriesId),
  };
}

export function ChartSeries({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const registration = useContext(ChartRegistrationContext);
  return (
    <g
      onPointerOver={() => registration?.setHoveredSeriesId(id)}
      onPointerDown={() => registration?.setHoveredSeriesId(id)}
    >
      {children}
    </g>
  );
}

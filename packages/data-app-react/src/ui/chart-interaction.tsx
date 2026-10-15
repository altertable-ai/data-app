import {
  createContext,
  useContext,
  useId,
  useEffect,
  type ReactNode,
} from 'react';

/** Coordinates in the chart SVG, shared by pointer tracking and active samples. */
export type ChartPoint = { x: number; y: number };

type ChartInteractionApi = {
  isPointerInspection: boolean;
  activePoint: ChartPoint | undefined;
  seriesCount: number;
  /** Line and area series register the sample at the current inspection position. */
  registerPoint: (id: string, x: number, y: number) => () => void;
  registerSeries: (id: string) => () => void;
  activeSeriesId: string | null;
  setHoveredSeriesId: (id: string | null) => void;
};

export const ChartInteractionContext =
  createContext<ChartInteractionApi | null>(null);

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
  const seriesId = id ?? generatedId;
  const registerSeries = interaction?.registerSeries;
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
  const interaction = useContext(ChartInteractionContext);
  return (
    <g
      onPointerOver={() => interaction?.setHoveredSeriesId(id)}
      onPointerDown={() => interaction?.setHoveredSeriesId(id)}
    >
      {children}
    </g>
  );
}

import {
  createContext,
  useContext,
  useId,
  useEffect,
  type ReactNode,
} from 'react';

export const ChartInteraction = createContext<{
  pointer: boolean;
  point: { x: number; y: number } | undefined;
  seriesCount: number;
  registerPoint: (id: string, x: number, y: number) => () => void;
  registerSeries: (id: string) => () => void;
  hovered: string | null;
  setHovered: (id: string | null) => void;
} | null>(null);

export function useChartSeries(id?: string) {
  const generatedId = useId();
  const interaction = useContext(ChartInteraction);
  const seriesId = id ?? generatedId;
  const registerSeries = interaction?.registerSeries;
  useEffect(() => registerSeries?.(seriesId), [registerSeries, seriesId]);
  return {
    id: seriesId,
    active:
      !interaction?.pointer ||
      interaction.seriesCount === 1 ||
      interaction.hovered === seriesId,
  };
}

export function ChartSeries({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const interaction = useContext(ChartInteraction);
  return (
    <g
      onPointerOver={() => interaction?.setHovered(id)}
      onPointerDown={() => interaction?.setHovered(id)}
    >
      {children}
    </g>
  );
}

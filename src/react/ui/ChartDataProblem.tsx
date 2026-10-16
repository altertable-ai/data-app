import { StatusPanel } from '@/src/react/ui/StatusPanel';

/** Replaces a chart whose displayed result cannot be plotted. */
export function ChartDataProblem({
  problem,
  className,
}: {
  problem: string;
  className?: string;
}) {
  return (
    <StatusPanel
      status="error"
      title="This result can't be charted"
      description={problem}
      className={className}
    />
  );
}

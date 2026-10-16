import { StatusPanel } from '@/src/react/ui/StatusPanel';

/** Replaces a visual whose displayed result cannot be shown. */
export function DataProblem({
  problem,
  className,
}: {
  problem: string;
  className?: string;
}) {
  return (
    <StatusPanel
      status="error"
      title="This result can't be displayed"
      description={problem}
      className={className}
    />
  );
}

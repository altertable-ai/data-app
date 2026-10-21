export function ProgressPercentage({ progress }: { progress: number }) {
  return (
    <span className="altertable-progress-percentage" aria-live="off">
      {Math.round(progress)}%
    </span>
  );
}

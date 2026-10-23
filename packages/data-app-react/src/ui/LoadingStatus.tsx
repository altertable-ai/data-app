import { ShimmerText } from './ShimmerText.tsx';
import { useDelayedLoading } from './useDelayedLoading.ts';

export function LoadingStatus({ label }: { label: string }) {
  const showLabel = useDelayedLoading(true);
  return (
    <output
      className="altertable-loading-status"
      data-visible={showLabel || undefined}
    >
      {showLabel ? <ShimmerText>{label}</ShimmerText> : null}
    </output>
  );
}

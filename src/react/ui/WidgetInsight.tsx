import type { ReactNode } from 'react';
import type { DataReading } from '@/src/core/reading';
import { Skeleton } from '@/src/react/ui/Skeleton';

/** A finding selected from displayed data, or authored static content. */
export type WidgetInsight = ReactNode | DataReading<ReactNode>;

export function renderWidgetInsight(
  insight: WidgetInsight,
  pending = false
): ReactNode {
  if (insight == null || typeof insight === 'boolean' || insight === '')
    return null;
  if (pending) return <Skeleton className="altertable-content-skeleton-foot" />;
  if (typeof insight === 'object' && 'loading' in insight) {
    return insight.loading ? (
      <Skeleton className="altertable-content-skeleton-foot" />
    ) : (
      renderWidgetInsight(insight.value)
    );
  }
  return insight;
}

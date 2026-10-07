import type { ReactNode } from 'react';
import type { DataReading } from '@/src/core/reading';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

export type EmptyContent = { title: ReactNode; description?: ReactNode };
export type SkeletonContent = {
  variant: 'metric' | 'panel' | 'ranking';
  /**
   * Placeholder rows, clamped to 0–100.
   * @default 4
   */
  rows?: number;
};

/** A bound widget must explain empty results and link the reading to its evidence. */
export type BoundWidgetReading<Data> = {
  reading: DataReading<Data>;
  isEmpty: (data: Data) => boolean;
  emptyFallback: EmptyContent;
  evidence: WidgetEvidence;
  skeleton?: SkeletonContent;
};

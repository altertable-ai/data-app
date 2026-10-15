import type { ComponentPropsWithRef, ReactNode } from 'react';
import { getDataFailure } from '@/src/react/data-failure';
import { Button } from '@/src/react/ui/Button';
import { useInspectionDefaults } from '@/src/react/ui/InspectionContext';
import { DataBoundary } from '@/src/react/ui/DataBoundary';
import type { DataView } from '@/src/core/data-view';
import { invariant } from '@/src/core/invariant';
import { EmptyState } from '@/src/react/ui/EmptyState';
import type { EmptyContent } from '@/src/react/ui/presentation';
import { StatusPanel } from '@/src/react/ui/StatusPanel';

export type SectionResult<Data, Input> = {
  view: DataView<Data, Input>;
  refetch: () => unknown;
};

export type DataSectionProps<Data, Input = unknown> = {
  children: (data: Data, displayedInput: Input) => ReactNode;
  /** Placeholder layout for an initial request; use the ready view's grid without copied values. */
  loadingFallback: ReactNode;
  error?: { title: ReactNode; description?: ReactNode; onRetry?: () => void };
  label?: string;
  notice?: 'none' | 'inline';
} & (
  | {
      result: SectionResult<Data, Input> & { emptyFallback: EmptyContent };
      emptyFallback?: EmptyContent;
    }
  | { result: SectionResult<Data, Input>; emptyFallback: EmptyContent }
) &
  Omit<ComponentPropsWithRef<'div'>, 'children'>;

/** One request boundary for any number of cards. `DataBoundary` exposes the lower-level
 * view-state slots internally. The primary DataApp request uses page-level feedback. */
export function DataSectionBoundary<Data, Input>({
  result,
  children,
  emptyFallback,
  loadingFallback,
  error,
  label,
  notice: feedback,
  ...props
}: DataSectionProps<Data, Input>) {
  const fallback =
    emptyFallback ??
    ('emptyFallback' in result ? result.emptyFallback : undefined);
  invariant(
    fallback,
    'A section needs an empty fallback from its result or props.'
  );
  const defaults = useInspectionDefaults();
  const notice =
    feedback ?? (defaults?.primaryView === result.view ? 'none' : 'inline');
  return (
    <DataBoundary
      {...props}
      view={result.view}
      role={label ? 'region' : undefined}
      aria-label={label}
      notice={notice}
      loadingFallback={loadingFallback}
      emptyFallback={<EmptyState {...fallback} />}
      error={cause => {
        const presentation = getDataFailure(cause);
        const retryAction =
          error?.onRetry ??
          (presentation.retryable ? () => void result.refetch() : undefined);

        return (
          <StatusPanel
            status="error"
            layout="inline"
            title={error?.title ?? presentation.message}
            description={error?.description}
            action={
              retryAction && (
                <Button variant="ghost" size="compact" onClick={retryAction}>
                  Retry
                </Button>
              )
            }
          />
        );
      }}
      staleError={cause =>
        error?.onRetry || getDataFailure(cause).retryable ? (
          <Button onClick={error?.onRetry ?? (() => void result.refetch())}>
            Retry
          </Button>
        ) : null
      }
    >
      {children}
    </DataBoundary>
  );
}

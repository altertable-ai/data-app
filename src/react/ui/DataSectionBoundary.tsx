import type { ComponentPropsWithRef, ReactNode } from 'react';
import { DataAppError } from '@/src/client/transport';
import { Button } from '@/src/react/ui/Button';
import { useInspectionDefaults } from '@/src/react/ui/InspectionContext';
import { DataBoundary } from '@/src/react/ui/DataBoundary';
import type { DataView } from '@/src/core/data-view';
import { invariant } from '@/src/core/invariant';
import { EmptyState } from '@/src/react/ui/EmptyState';
import type { EmptyContent } from '@/src/react/ui/presentation';
import { StatusPanel } from '@/src/react/ui/StatusPanel';

function errorPresentation(cause: Error) {
  const code = cause instanceof DataAppError ? cause.code : 'request_failed';
  switch (code) {
    case 'source_unauthorized':
      return {
        title: 'Connection needs attention',
        description: 'Ask the app owner to reconnect the lakehouse.',
        retryable: false,
      };
    case 'source_forbidden':
      return {
        title: 'Data access denied',
        description:
          'The selected profile cannot read this data. Ask the app owner for access.',
        retryable: false,
      };
    case 'source_query_rejected':
      return {
        title: 'This view cannot run its query',
        description: 'Ask the app owner to check the data operation.',
        retryable: false,
      };
    case 'source_rate_limited':
      return {
        title: 'Data source is busy',
        description: 'The lakehouse is handling too many requests.',
        retryable: true,
      };
    case 'timeout':
      return {
        title: 'Request timed out',
        description: 'The lakehouse took too long to respond.',
        retryable: true,
      };
    case 'source_unavailable':
      return {
        title: 'Couldn’t load results',
        description: 'The lakehouse isn’t responding.',
        retryable: true,
      };
    default:
      return {
        title: 'Couldn’t load results',
        description: 'The data request failed.',
        retryable: true,
      };
  }
}

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
        const presentation = errorPresentation(cause);
        const retryAction =
          error?.onRetry ??
          (presentation.retryable ? () => void result.refetch() : undefined);

        return (
          <StatusPanel
            status="error"
            title={error?.title ?? presentation.title}
            description={error?.description ?? presentation.description}
            action={retryAction && <Button onClick={retryAction}>Retry</Button>}
          />
        );
      }}
      staleError={() => (
        <Button onClick={error?.onRetry ?? (() => void result.refetch())}>
          Retry
        </Button>
      )}
    >
      {children}
    </DataBoundary>
  );
}

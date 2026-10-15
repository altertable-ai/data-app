import { WidgetRequestContext } from '@/src/react/widget-request';
import { getDataFailure } from '@/src/react/data-failure';
import { StatusPanel } from '@/src/react/ui/StatusPanel';
import { Button } from '@/src/react/ui/Button';
import { getAnnotationProps } from '@/src/react/annotations/getAnnotationProps';
import {
  useId,
  useContext,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactNode,
} from 'react';
import { formatCount } from '@/src/core/format';
import { AboutData } from '@/src/react/ui/AboutData';
import { AppIcon } from '@/src/react/ui/icons';
import {
  WidgetStatusControl,
  type WidgetStatus,
} from '@/src/react/ui/RequestHint';
import { classNames } from '@/src/react/ui/classNames';
import { ContentSkeletonBody } from '@/src/react/ui/ContentSkeleton';
import { EmptyState } from '@/src/react/ui/EmptyState';
import type {
  EmptyContent,
  BoundWidgetReading,
} from '@/src/react/ui/presentation';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

type DataWidgetBaseProps = {
  title: ReactNode;
  /** Document outline level. The widget title keeps the shared widget-heading appearance. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Unique stable target for persisted feedback; overrides automatic evidence identity. */
  annotationId?: string;
  /** Result count beside the heading. Derive from the displayed result; zero is visible. */
  count?: number;
  description?: ReactNode;
  evidence?: WidgetEvidence;
  action?: ReactNode;
  /** Reserved feedback slot; retain displayed content while refreshing or after failure. */
  status?: WidgetStatus;
  footer?: ReactNode;
  bodyPadding?: 'inset' | 'flush';
} & Omit<ComponentPropsWithRef<'section'>, 'about' | 'title' | 'children'>;

/** Owns loading, empty content, actions, and inspection. Page and sheet mount the same
 * body and footer; hold interactive child state above the widget to share it across mounts.
 * A bound reading requires evidence; its child renderer runs only for nonempty ready data. */
export type DataWidgetProps<Data = unknown> = DataWidgetBaseProps &
  (
    | (BoundWidgetReading<Data> & {
        children: (data: Data) => ReactNode;
      })
    | {
        reading?: never;
        isEmpty?: never;
        skeleton?: never;
        emptyFallback?: EmptyContent;
        children: ReactNode;
      }
  );

export function DataWidget<Data>(props: DataWidgetProps<Data>) {
  if (props.reading) {
    const { reading, isEmpty, emptyFallback, skeleton, children, ...shell } =
      props;
    if (reading.loading)
      return (
        <DataWidgetContent {...shell} aria-busy>
          <ContentSkeletonBody variant="panel" {...skeleton} />
        </DataWidgetContent>
      );
    const noData = isEmpty(reading.value);

    return (
      <DataWidgetContent
        {...shell}
        emptyFallback={noData ? emptyFallback : undefined}
      >
        {noData ? null : children(reading.value)}
      </DataWidgetContent>
    );
  }

  return <DataWidgetContent {...props} />;
}

function DataWidgetContent({
  title,
  headingLevel = 2,
  annotationId,
  count,
  description,
  evidence,
  action,
  status,
  footer,
  emptyFallback,
  bodyPadding = 'inset',
  children,
  className,
  ...props
}: DataWidgetBaseProps & {
  emptyFallback?: EmptyContent;
  children: ReactNode;
}) {
  const request = useContext(WidgetRequestContext);
  const view = request?.renderFailed ? undefined : request?.view;
  if (view?.kind === 'updating')
    status = { kind: 'updating', message: view.message };
  else if (view?.kind === 'stale-error') {
    const presentation = getDataFailure(view.error);
    status = {
      kind: 'error',
      message: view.message,
      onRetry: presentation.retryable
        ? () => void request?.refetch()
        : undefined,
    };
  } else if (request) status ??= { kind: 'idle' };
  if (view?.kind === 'error') {
    const presentation = getDataFailure(view.error);
    children = (
      <StatusPanel
        status="error"
        title={presentation.message}
        action={
          presentation.retryable && (
            <Button
              variant="ghost"
              size="compact"
              onClick={() => void request?.refetch()}
            >
              Retry
            </Button>
          )
        }
      />
    );
    emptyFallback = undefined;
    footer = undefined;
    props['aria-busy'] = undefined;
  } else if (view?.kind === 'empty') {
    emptyFallback = request?.emptyFallback;
    footer = undefined;
    props['aria-busy'] = undefined;
  }
  const titleId = useId();
  const Heading = `h${headingLevel}` as ElementType;
  const content = emptyFallback ? <EmptyState {...emptyFallback} /> : children;
  const visual = (
    <WidgetContent
      bodyPadding={emptyFallback ? 'flush' : bodyPadding}
      footer={emptyFallback ? undefined : footer}
      status={status}
    >
      {content}
    </WidgetContent>
  );
  const explicitAnnotationId = annotationId ?? props.id;
  const busy = props['aria-busy'] === true || props['aria-busy'] === 'true';
  const help =
    evidence && !busy ? (
      <AboutData
        id={evidence.id}
        references={{
          kind: 'ids',
          glossaryIds: evidence.glossaryIds,
          queryNames: evidence.queryNames,
        }}
        aria-label={
          typeof title === 'string' ? `Explore ${title}` : 'Explore this widget'
        }
        variant="ghost"
        className="altertable-widget-heading-trigger"
        shortcut={false}
        title={title}
        headerActions={<WidgetStatusControl status={status} />}
        description={description}
        visual={visual}
        visualKind="widget"
      >
        <span className="altertable-widget-heading-label">{title}</span>
        {count !== undefined && (
          <span className="altertable-data-widget-count">
            {formatCount(count)}
          </span>
        )}
        <AppIcon name="openDetails" size="1em" />
      </AboutData>
    ) : undefined;

  return (
    <section
      {...props}
      {...getAnnotationProps({
        id: explicitAnnotationId ?? evidence?.id ?? titleId,
        fallbackId:
          explicitAnnotationId === undefined && evidence?.id
            ? titleId
            : undefined,
        label: typeof title === 'string' ? title : undefined,
        evidence,
      })}
      className={classNames('altertable-data-widget', className)}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
    >
      <header className="altertable-data-widget-header">
        <div>
          <Heading
            id={titleId}
            className="altertable-widget-heading"
            aria-label={typeof title === 'string' ? title : undefined}
          >
            {help ?? title}
            {!help && count !== undefined && (
              <span className="altertable-data-widget-count">
                {formatCount(count)}
              </span>
            )}
          </Heading>
          {description && <p>{description}</p>}
          {request?.scope && !request.scope.loading && (
            <p>{request.scope.value}</p>
          )}
        </div>
        <div className="altertable-data-widget-help">
          <WidgetStatusControl status={status} />
          {action}
        </div>
      </header>
      {visual}
    </section>
  );
}

/** The page and inspection sheet render the same body and footer, with the same spacing. */
function WidgetContent({
  bodyPadding,
  footer,
  status,
  children,
}: {
  bodyPadding: 'inset' | 'flush';
  footer?: ReactNode;
  status?: WidgetStatus;
  children: ReactNode;
}) {
  return (
    <>
      <div
        className="altertable-data-widget-body"
        data-padding={bodyPadding}
        aria-busy={status?.kind === 'updating' || undefined}
      >
        {children}
      </div>
      {footer && (
        <footer className="altertable-data-widget-footer">{footer}</footer>
      )}
    </>
  );
}

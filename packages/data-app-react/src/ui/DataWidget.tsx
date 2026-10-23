import { formatCount } from '@altertable/data-app/format';
import {
  useId,
  useContext,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactNode,
} from 'react';

import { getAnnotationProps } from '../annotations/getAnnotationProps.ts';
import type { InspectionRecords } from './AboutData.tsx';
import { AboutData } from './AboutData.tsx';
import { classNames } from './classNames.ts';
import { ContentSkeletonBody } from './ContentSkeleton.tsx';
import { EmptyState } from './EmptyState.tsx';
import { AppIcon } from './icons.ts';
import { InspectionVisual } from './InspectionProvider.tsx';
import { LoadingStatus } from './LoadingStatus.tsx';
import type { EmptyContent, BoundWidgetReading } from './presentation.ts';
import {
  WidgetStatusControl,
  WidgetStatusContext,
  type WidgetStatus,
} from './RequestHint.tsx';
import type { WidgetEvidence } from './WidgetEvidence.ts';

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
  /** Lazy detail records rendered as the first inspection tab. */
  records?: InspectionRecords;
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
  records,
  action,
  status: suppliedStatus,
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
  const titleId = useId();
  const sectionStatus = useContext(WidgetStatusContext);
  const status = suppliedStatus ?? sectionStatus;
  const inspectionVisual = useContext(InspectionVisual);
  const Heading = `h${headingLevel}` as ElementType;
  const busy = props['aria-busy'] === true || props['aria-busy'] === 'true';
  const content = emptyFallback ? <EmptyState {...emptyFallback} /> : children;
  const visual = (
    <WidgetContent
      bodyPadding={emptyFallback ? 'flush' : bodyPadding}
      footer={emptyFallback ? undefined : footer}
      loadingLabel={
        busy
          ? typeof title === 'string'
            ? `Loading ${title}`
            : 'Loading data'
          : undefined
      }
      status={status}
    >
      {content}
    </WidgetContent>
  );
  const explicitAnnotationId = annotationId ?? props.id;
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
        records={records}
        visual={visual}
        visualKind="widget"
      >
        <span className="altertable-widget-heading-label">{title}</span>
        {count !== undefined && (
          <span className="altertable-data-widget-count">
            {formatCount(count)}
          </span>
        )}
        {!inspectionVisual && <AppIcon name="openDetails" size="1em" />}
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
        <div className="altertable-data-widget-heading-row">
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
          <div
            className="altertable-data-widget-help"
            data-has-action={!!action || undefined}
          >
            <WidgetStatusControl status={status} />
            {action}
          </div>
        </div>
        {description && <p>{description}</p>}
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
  loadingLabel,
  children,
}: {
  bodyPadding: 'inset' | 'flush';
  footer?: ReactNode;
  status?: WidgetStatus;
  loadingLabel?: string;
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
        {loadingLabel && <LoadingStatus label={loadingLabel} />}
      </div>
      {footer && (
        <footer className="altertable-data-widget-footer">{footer}</footer>
      )}
    </>
  );
}

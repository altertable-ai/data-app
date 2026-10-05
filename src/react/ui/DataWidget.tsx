import {
  renderWidgetInsight,
  type WidgetInsight,
} from '@/src/react/ui/WidgetInsight';
import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
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
  count?: number;
  description?: ReactNode;
  evidence?: WidgetEvidence;
  action?: ReactNode;
  /** Reserved feedback slot; retain displayed content while refreshing or after failure. */
  status?: WidgetStatus;
  footer?: WidgetInsight;
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
        empty?: EmptyContent;
        children: ReactNode;
      }
  );

export function DataWidget<Data>(props: DataWidgetProps<Data>) {
  if (props.reading) {
    const { reading, isEmpty, empty, skeleton, children, ...shell } = props;
    if (reading.loading)
      return (
        <DataWidgetLoading {...shell}>
          <ContentSkeletonBody variant="panel" {...skeleton} />
        </DataWidgetLoading>
      );
    const noData = isEmpty(reading.value);

    return (
      <DataWidgetContent {...shell} empty={noData ? empty : undefined}>
        {noData ? null : children(reading.value)}
      </DataWidgetContent>
    );
  }

  return <DataWidgetContent {...props} />;
}

/** Preserve the authored frame and reserve its insight slot without rendering findings. */
export function DataWidgetLoading({
  evidence: _evidence,
  footer,
  empty: _empty,
  ...shell
}: DataWidgetBaseProps & { empty?: EmptyContent; children: ReactNode }) {
  return (
    <DataWidgetContent
      {...shell}
      aria-busy="true"
      footer={renderWidgetInsight(footer, true)}
    />
  );
}

function DataWidgetContent({
  title,
  count,
  description,
  evidence,
  action,
  status,
  footer,
  empty,
  bodyPadding = 'inset',
  children,
  className,
  ...props
}: DataWidgetBaseProps & { empty?: EmptyContent; children: ReactNode }) {
  const titleId = useId();
  const content = empty ? <EmptyState {...empty} /> : children;
  const visual = (
    <WidgetContent
      bodyPadding={empty ? 'flush' : bodyPadding}
      footer={empty ? undefined : footer}
      status={status}
    >
      {content}
    </WidgetContent>
  );
  const help = evidence && (
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
      tooltip="Explore this widget"
      shortcut={false}
      title={title}
      headerActions={<WidgetStatusControl status={status} />}
      description={description}
      visual={visual}
      visualKind="widget"
    >
      {title}
      <AppIcon name="openDetails" />
    </AboutData>
  );

  return (
    <section
      {...props}
      className={classNames('altertable-data-widget', className)}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
    >
      <header className="altertable-data-widget-header">
        <div>
          <h2
            id={titleId}
            aria-label={typeof title === 'string' ? title : undefined}
          >
            {help ?? title}
            {count !== undefined && (
              <span className="altertable-data-widget-count">
                {formatCount(count)}
              </span>
            )}
          </h2>
          {description && <p>{description}</p>}
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
  footer?: WidgetInsight;
  status?: WidgetStatus;
  children: ReactNode;
}) {
  const shownFooter = renderWidgetInsight(footer);
  return (
    <>
      <div
        className="altertable-data-widget-body"
        data-padding={bodyPadding}
        aria-busy={status?.kind === 'updating' || undefined}
      >
        {children}
      </div>
      {shownFooter != null && (
        <footer className="altertable-data-widget-footer">{shownFooter}</footer>
      )}
    </>
  );
}

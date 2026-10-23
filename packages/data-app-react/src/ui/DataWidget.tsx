import {
  appDiagnostics,
  getDataAppTransport,
} from '@altertable/data-app/client';
import { formatCount } from '@altertable/data-app/format';
import {
  useId,
  Component,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useContext,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactNode,
} from 'react';

import { getAnnotationProps } from '../annotations/getAnnotationProps.ts';
import type { InspectionRecords } from './AboutData.tsx';
import { AboutData } from './AboutData.tsx';
import { Button } from './Button.tsx';
import { classNames } from './classNames.ts';
import { ContentSkeletonBody } from './ContentSkeleton.tsx';
import { EmptyState } from './EmptyState.tsx';
import { AppIcon } from './icons.ts';
import { InspectionVisual } from './InspectionProvider.tsx';
import type { EmptyContent, BoundWidgetReading } from './presentation.ts';
import { WidgetStatusControl, type WidgetStatus } from './RequestHint.tsx';
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

function DataWidgetInner<Data>(props: DataWidgetProps<Data>) {
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
        {noData ? null : (
          <WidgetRender render={() => children(reading.value)} />
        )}
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
  const titleId = useId();
  const inspectionVisual = useContext(InspectionVisual);
  const Heading = `h${headingLevel}` as ElementType;
  const content = emptyFallback ? <EmptyState {...emptyFallback} /> : children;
  const visual = (
    <WidgetContent
      bodyPadding={emptyFallback ? 'flush' : bodyPadding}
      footer={emptyFallback ? undefined : footer}
      status={status}
    >
      <WidgetBoundary name={typeof title === 'string' ? title : 'Widget'} body>
        {content}
      </WidgetBoundary>
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

function WidgetRender({ render }: { render: () => ReactNode }) {
  return render();
}

export const DataWidget = withWidgetBoundary(DataWidgetInner);

function RepairButton() {
  const bridge = getDataAppTransport();
  const [state, setState] = useState(bridge?.snapshot());
  const [pending, setPending] = useState(false);
  useEffect(() => bridge?.subscribe(setState), [bridge]);
  const status =
    state && typeof state === 'object' && 'repair' in state
      ? state.repair
      : undefined;
  return (
    <Button
      size="compact"
      variant="outline"
      disabled={
        pending || status === 'pending' || !status || status === 'unsupported'
      }
      onClick={() => {
        if (!bridge || pending) return;
        setPending(true);
        // Send the report and manual intent atomically through the shared controller.
        void bridge
          .request({
            route: 'diagnostics:repair',
            payload: appDiagnostics.snapshot(),
          })
          .catch(() => {})
          .finally(() => setPending(false));
      }}
    >
      Fix error
    </Button>
  );
}

class RenderBoundary extends Component<
  {
    name: string;
    identity: string;
    children: ReactNode;
    height: () => number;
    width: () => number;
    body?: boolean;
    shell?: DataWidgetBaseProps;
  },
  { failed: boolean; message?: string }
> {
  override state: { failed: boolean; message?: string } = { failed: false };
  static getDerivedStateFromError(error: unknown) {
    return {
      failed: true,
      message:
        error instanceof Error
          ? error.message.slice(0, 240)
          : 'An unexpected render error occurred.',
    };
  }
  override componentDidCatch(error: unknown) {
    appDiagnostics.record(
      'render',
      this.props.name,
      error,
      this.props.identity
    );
  }
  override componentWillUnmount() {
    appDiagnostics.clear('render', this.props.name, this.props.identity);
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    const error = (
      <section
        className="altertable-widget-error"
        aria-label={`${this.props.name} error`}
        style={
          this.props.body
            ? {
                height: this.props.height() || undefined,
                minHeight: this.props.height() ? 0 : undefined,
              }
            : undefined
        }
      >
        <div className="altertable-widget-error-copy" role="alert">
          <strong>This widget couldn’t render</strong>
          <p>{this.state.message || 'Other content is still available.'}</p>
        </div>
        <RepairButton />
      </section>
    );
    if (this.props.body) return error;
    return (
      <DataWidgetContent
        {...this.props.shell}
        title={this.props.shell?.title ?? this.props.name}
        className={classNames(
          this.props.shell?.className,
          'altertable-widget-error-frame'
        )}
        style={{
          ...this.props.shell?.style,
          height: this.props.height() || undefined,
          width: this.props.width() || undefined,
          maxWidth: '100%',
          minHeight: this.props.height() ? 0 : undefined,
        }}
      >
        {error}
      </DataWidgetContent>
    );
  }
}

function WidgetBoundary({
  name,
  children,
  body,
  shell,
}: {
  name: string;
  children: ReactNode;
  body?: boolean;
  shell?: DataWidgetBaseProps;
}) {
  const identity = useId();
  const ref = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  const width = useRef(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    function measure() {
      if (element!.querySelector('.altertable-widget-error')) return;
      const frame =
        element!.querySelector('.altertable-data-widget') ?? element!;
      const bounds = frame.getBoundingClientRect();
      height.current = bounds.height;
      width.current = bounds.width;
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const frame = element.querySelector('.altertable-data-widget');
    if (frame) observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="altertable-widget-boundary">
      <RenderBoundary
        name={name}
        identity={identity}
        height={() => height.current}
        width={() => width.current}
        body={body}
        shell={shell}
      >
        {children}
      </RenderBoundary>
    </div>
  );
}

/** Keep generic widget props intact while isolating selectors and render callbacks. */
export function withWidgetBoundary<Widget extends (props: any) => ReactNode>(
  Widget: Widget
): Widget {
  return ((props: Parameters<Widget>[0]) => (
    <WidgetBoundary
      shell={{
        title:
          props.title ??
          props.label ??
          props.metric?.definition?.label ??
          props.dataset?.name ??
          'Widget',
        headingLevel: props.headingLevel,
        description: props.description,
        footer: props.footer,
        action: props.action,
        className: props.className,
        style: props.style,
      }}
      name={
        typeof props.title === 'string'
          ? props.title
          : typeof props.label === 'string'
            ? props.label
            : (props.metric?.definition?.label ??
              props.dataset?.name ??
              'Widget')
      }
    >
      <Widget {...props} />
    </WidgetBoundary>
  )) as Widget;
}

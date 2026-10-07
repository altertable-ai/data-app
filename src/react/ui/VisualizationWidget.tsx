import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { DataWidget, type DataWidgetProps } from '@/src/react/ui/DataWidget';
import type { BoundWidgetReading } from '@/src/react/ui/presentation';
import { ContentSkeletonBody } from '@/src/react/ui/ContentSkeleton';
import { validateWidgetViews } from '@/src/react/ui/widget-views';
import { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';

type VisualizationWidgetBaseProps = Pick<
  DataWidgetProps,
  | 'title'
  | 'description'
  | 'count'
  | 'action'
  | 'evidence'
  | 'status'
  | 'emptyFallback'
> & {
  /** Controls placed before the supporting insight, such as table pagination. */
  footer?: ReactNode;
  insight?: ReactNode;
} & Omit<ComponentPropsWithRef<'section'>, 'about' | 'title' | 'children'>;

type UnboundVisualizationWidgetProps = VisualizationWidgetBaseProps &
  (
    | { loading: true; loadingContent?: ReactNode; visual?: never }
    | { loading?: false; visual: ReactNode; loadingContent?: never }
  );

export type VisualizationWidgetView<Data> = {
  /** Stable, nonempty identity; unique within this widget. */
  id: string;
  label: ReactNode;
  render: (data: Data) => ReactNode;
};

type BoundVisualizationWidgetBase<Data> = VisualizationWidgetBaseProps &
  BoundWidgetReading<Data> & {
    visual?: never;
    loading?: never;
  };

/** DataWidget frame for charts, DataTable, metrics, or a custom data display.
 * Owns alternate-view selection and shares it with inspection. Built-in charts own
 * transient tooltips; lift persistent custom interactions above both mounts.
 * For narrative prose use the sibling TextWidget, which composes DataWidget directly. */
export type VisualizationWidgetProps<Data = unknown> =
  | UnboundVisualizationWidgetProps
  | (BoundVisualizationWidgetBase<Data> & {
      children: (data: Data) => ReactNode;
      views?: never;
    })
  | (BoundVisualizationWidgetBase<Data> & {
      views: readonly VisualizationWidgetView<Data>[];
      viewLabel: string;
      /** An existing view ID; defaults to the first view. Validated while loading too. */
      initialView?: string;
      children?: never;
    });

/** Compose an unframed visual with the shared heading, insight, and inspection. */
export function VisualizationWidget<Data>(
  props: VisualizationWidgetProps<Data>
) {
  if ('views' in props && props.views)
    return <VisualizationWidgetWithViews {...props} />;
  if ('reading' in props) {
    const {
      reading,
      children,
      isEmpty,
      emptyFallback,
      skeleton,
      insight,
      footer,
      ...shell
    } = props;

    return (
      <DataWidget
        {...shell}
        reading={reading}
        isEmpty={isEmpty}
        emptyFallback={emptyFallback}
        skeleton={skeleton}
        footer={widgetFooter(footer, insight)}
      >
        {data => (
          <div className="altertable-visualization-widget-content">
            {children(data)}
          </div>
        )}
      </DataWidget>
    );
  }
  const {
    visual,
    loading = false,
    loadingContent,
    insight,
    footer,
    ...shell
  } = props;
  if (loading)
    return (
      <DataWidget
        {...shell}
        evidence={undefined}
        footer={widgetFooter(footer, insight)}
        aria-busy
      >
        <div className="altertable-visualization-widget-content">
          {loadingContent ?? <ContentSkeletonBody variant="panel" />}
        </div>
      </DataWidget>
    );

  return (
    <DataWidget {...shell} footer={widgetFooter(footer, insight)}>
      <div className="altertable-visualization-widget-content">{visual}</div>
    </DataWidget>
  );
}

function VisualizationWidgetWithViews<Data>({
  reading,
  views,
  viewLabel,
  initialView,
  isEmpty,
  emptyFallback,
  skeleton,
  insight,
  footer,
  ...shell
}: BoundVisualizationWidgetBase<Data> & {
  views: readonly VisualizationWidgetView<Data>[];
  viewLabel: string;
  initialView?: string;
}) {
  const [selected, setSelected] = useState(initialView ?? views[0]?.id ?? '');
  validateWidgetViews(views, selected);

  return (
    <DataWidget
      {...shell}
      reading={reading}
      isEmpty={isEmpty}
      emptyFallback={emptyFallback}
      skeleton={skeleton}
      footer={widgetFooter(footer, insight)}
    >
      {data => (
        <div className="altertable-visualization-widget-content">
          <WidgetViewTabs
            label={viewLabel}
            views={views.map(view => ({
              id: view.id,
              label: view.label,
              content: view.render(data),
              isEmpty: false,
              emptyFallback,
            }))}
            selectedKey={selected}
            onSelectionChange={setSelected}
          />
        </div>
      )}
    </DataWidget>
  );
}

function widgetFooter(footer: ReactNode, insight: ReactNode) {
  return footer && insight ? (
    <>
      {footer}
      {insight}
    </>
  ) : (
    footer || insight
  );
}

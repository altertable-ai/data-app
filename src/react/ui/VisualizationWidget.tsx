import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
import { DataWidget, type DataWidgetProps } from '@/src/react/ui/DataWidget';
import type { EmptyStateProps } from '@/src/react/ui/EmptyState';
import type { DataReading } from '@/src/core/reading';
import {
  ContentSkeleton,
  type ContentSkeletonProps,
} from '@/src/react/ui/ContentSkeleton';
import { validateWidgetViews } from '@/src/react/ui/widget-views';
import { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';
import '@/src/react/ui/VisualizationWidget.css';

type VisualizationWidgetBaseProps = {
  title: ReactNode;
  description?: ReactNode;
  insight?: ReactNode;
  action?: ReactNode;
  evidence?: WidgetEvidence;
  status?: DataWidgetProps['status'];
  empty?: Pick<EmptyStateProps, 'title' | 'description'>;
} & Omit<ComponentPropsWithRef<'section'>, 'about' | 'title' | 'children'>;

type UnboundVisualizationWidgetProps = VisualizationWidgetBaseProps &
  ({ loading: true; visual?: never } | { loading?: false; visual: ReactNode });

export type VisualizationWidgetView<Data> = {
  /** Stable, nonempty identity; unique within this widget. */
  id: string;
  label: ReactNode;
  render: (data: Data) => ReactNode;
};

type BoundVisualizationWidgetBase<Data> = VisualizationWidgetBaseProps & {
  evidence: WidgetEvidence;
  reading: DataReading<Data>;
  isEmpty: (data: Data) => boolean;
  empty: Pick<EmptyStateProps, 'title' | 'description'>;
  skeleton?: Pick<ContentSkeletonProps, 'variant' | 'rows'>;
  visual?: never;
  loading?: never;
};

/** The widget owns alternate-view selection and shares it with inspection.
 * Custom chart interactions remain controlled by the caller, above both mounts. */
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

export function VisualizationWidget<Data>(
  props: VisualizationWidgetProps<Data>
) {
  if ('views' in props && props.views)
    return <VisualizationWidgetWithViews {...props} />;
  if ('reading' in props) {
    const { reading, children, isEmpty, empty, skeleton, insight, ...shell } =
      props;

    return (
      <DataWidget
        {...shell}
        reading={reading}
        isEmpty={isEmpty}
        empty={empty}
        skeleton={skeleton}
        footer={insight}
      >
        {data => (
          <div className="altertable-visualization-widget-content">
            {children(data)}
          </div>
        )}
      </DataWidget>
    );
  }
  const { visual, loading = false, insight, ...shell } = props;
  if (loading)
    return <ContentSkeleton variant="panel" className={shell.className} />;

  return (
    <DataWidget {...shell} footer={insight}>
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
  empty,
  skeleton,
  insight,
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
      empty={empty}
      skeleton={skeleton}
      footer={insight}
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
              empty,
            }))}
            selectedKey={selected}
            onSelectionChange={setSelected}
          />
        </div>
      )}
    </DataWidget>
  );
}

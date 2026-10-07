import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';
import { DataWidget } from '@/src/react/ui/DataWidget';
import type { WidgetStatus } from '@/src/react/ui/RequestHint';
import type {
  EmptyContent,
  BoundWidgetReading,
} from '@/src/react/ui/presentation';
import { ContentSkeleton } from '@/src/react/ui/ContentSkeleton';
import { validateWidgetViews } from '@/src/react/ui/widget-views';
import { WidgetViewTabs } from '@/src/react/ui/WidgetViewTabs';

type VisualizationWidgetBaseProps = {
  title: ReactNode;
  annotationId?: string;
  description?: ReactNode;
  action?: ReactNode;
  evidence?: WidgetEvidence;
  status?: WidgetStatus;
  empty?: EmptyContent;
} & Omit<ComponentPropsWithRef<'section'>, 'about' | 'title' | 'children'>;

type UnboundVisualizationWidgetProps = VisualizationWidgetBaseProps &
  ({ loading: true; visual?: never } | { loading?: false; visual: ReactNode });

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
    const { reading, children, isEmpty, empty, skeleton, ...shell } = props;

    return (
      <DataWidget
        {...shell}
        reading={reading}
        isEmpty={isEmpty}
        empty={empty}
        skeleton={skeleton}
      >
        {data => (
          <div className="altertable-visualization-widget-content">
            {children(data)}
          </div>
        )}
      </DataWidget>
    );
  }
  const { visual, loading = false, ...shell } = props;
  if (loading)
    return <ContentSkeleton variant="panel" className={shell.className} />;

  return (
    <DataWidget {...shell}>
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

import { type ReactNode } from 'react';
import { type DataReading } from '@altertable/data-app/internal';
import { DataWidget, type DataWidgetProps } from './DataWidget.tsx';
import { classNames } from './classNames.ts';
import { Skeleton } from './Skeleton.tsx';
import { TextContent } from './TextContent.tsx';
import { type WidgetEvidence } from './WidgetEvidence.ts';

type TextWidgetBaseProps = Omit<
  Extract<DataWidgetProps, { reading?: never }>,
  'reading' | 'children' | 'isEmpty' | 'empty' | 'skeleton' | 'bodyPadding'
>;

/** Narrative sibling of VisualizationWidget, composing DataWidget with TextContent.
 * Use TextContent directly for borderless prose. Bind claims and scope to the same displayed reading.
 * The renderer handles every ready value, including zero and empty collections. */
export type TextWidgetProps<Data = unknown> = TextWidgetBaseProps &
  (
    | {
        reading: DataReading<Data>;
        evidence: WidgetEvidence;
        children: (data: Data) => ReactNode;
      }
    | { reading?: never; children: ReactNode }
  );

export function TextWidget<Data>(props: TextWidgetProps<Data>) {
  const content = props.reading
    ? props.reading.loading
      ? null
      : props.children(props.reading.value)
    : props.children;
  const { reading, children: _, className, ...shell } = props;
  const loading = reading?.loading === true;

  return (
    <DataWidget
      {...shell}
      className={classNames('altertable-text-widget', className)}
      evidence={shell.evidence}
      aria-busy={loading || shell['aria-busy']}
    >
      <TextContent>
        {loading ? (
          <div className="altertable-text-widget-skeleton" aria-hidden="true">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : (
          content
        )}
      </TextContent>
    </DataWidget>
  );
}

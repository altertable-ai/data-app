import type { ComponentPropsWithRef } from 'react';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

import { getAnnotationProps } from '@/src/react/annotations/getAnnotationProps';

export type AnnotationTargetProps = ComponentPropsWithRef<'div'> & {
  annotationId: string;
  label: string;
  evidence?: WidgetEvidence;
};

/** A stable feedback target for app-owned content outside the built-in widgets. */
export function AnnotationTarget({
  annotationId,
  label,
  evidence,
  ...props
}: AnnotationTargetProps) {
  return (
    <div
      {...props}
      {...getAnnotationProps({
        id: annotationId,
        label,
        evidence,
        kind: 'element',
      })}
    />
  );
}

import type { ComponentPropsWithRef } from 'react';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

type AnnotationPropsOptions = {
  id?: string;
  label?: string;
  evidence?: WidgetEvidence;
  kind?: 'widget' | 'element';
};

export function getAnnotationProps({
  id,
  label,
  evidence,
  kind = 'widget',
}: AnnotationPropsOptions) {
  return {
    'data-annotation-id': id ?? evidence?.id,
    'data-annotation-label': label?.slice(0, 256),
    'data-annotation-kind': kind,
    'data-annotation-queries': JSON.stringify(evidence?.queryNames ?? []),
    'data-annotation-glossary': JSON.stringify(evidence?.glossaryIds ?? []),
  };
}

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

import type { ComponentPropsWithRef } from 'react';
import type { WidgetEvidence } from '@/src/react/ui/WidgetEvidence';

export function annotationAttributes({
  id,
  label,
  evidence,
  kind = 'widget',
}: {
  id?: string;
  label?: string;
  evidence?: WidgetEvidence;
  kind?: 'widget' | 'element';
}) {
  return {
    'data-annotation-id': id ?? evidence?.id,
    'data-annotation-label': label?.slice(0, 256),
    'data-annotation-kind': kind,
    'data-annotation-queries': JSON.stringify(evidence?.queryNames ?? []),
    'data-annotation-glossary': JSON.stringify(evidence?.glossaryIds ?? []),
  };
}

/** A stable feedback target for app-owned content outside the built-in widgets. */
export function AnnotationTarget({
  annotationId,
  label,
  evidence,
  ...props
}: ComponentPropsWithRef<'div'> & {
  annotationId: string;
  label: string;
  evidence?: WidgetEvidence;
}) {
  return (
    <div
      {...props}
      {...annotationAttributes({
        id: annotationId,
        label,
        evidence,
        kind: 'element',
      })}
    />
  );
}

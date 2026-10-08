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

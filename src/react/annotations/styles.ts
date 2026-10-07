import { injectStyles } from '@/src/react/injectStyles';
import type { DataAppStylesOptions } from '@/src/react/styles';

declare const ANNOTATION_STYLES: string;

/** Install only the outer-frame annotation controls; leave host page typography and layout intact. */
export function injectDataAppAnnotationStyles(
  options: DataAppStylesOptions = {}
): HTMLStyleElement {
  return injectStyles({
    name: 'injectDataAppAnnotationStyles',
    attribute: 'data-altertable-annotation-styles',
    css: ANNOTATION_STYLES,
    options,
  });
}

import { injectStyles } from '../injectStyles.ts';
import { type DataAppStylesOptions } from '../styles.ts';

declare const ANNOTATION_STYLES: string;

/**
 * Install only the outer-frame annotation controls; leave host page typography and layout intact.
 * @ignore
 */
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

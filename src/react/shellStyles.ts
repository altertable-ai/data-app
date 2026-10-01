import { injectStyles } from '@/src/react/injectStyles';
import type { DataAppStylesOptions } from '@/src/react/styles';

// Replaced with the compiled shell stylesheet by the package build.
declare const SHELL_STYLES: string;

/** Install shared layout, widget surface, and skeleton styles once per document, before mounting. */
export function injectDataAppShellStyles(
  options: DataAppStylesOptions = {}
): HTMLStyleElement {
  return injectStyles({
    name: 'injectDataAppShellStyles',
    attribute: 'data-altertable-shell-styles',
    css: SHELL_STYLES,
    options,
  });
}

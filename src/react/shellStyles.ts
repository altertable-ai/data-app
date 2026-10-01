import { injectStyles } from '@/src/react/injectStyles';
import type { DataAppStylesOptions } from '@/src/react/styles';

// Replaced with the compiled shell stylesheet by the package build.
declare const SHELL_STYLES: string;

/** Install shared layout, widget surface, and skeleton styles once per document, before mounting. */
export function injectShellStyles(
  options: DataAppStylesOptions = {}
): HTMLStyleElement {
  return injectStyles(
    'injectShellStyles',
    'data-altertable-shell-styles',
    SHELL_STYLES,
    options
  );
}

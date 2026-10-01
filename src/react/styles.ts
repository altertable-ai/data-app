import { injectStyles } from '@/src/react/injectStyles';

// Replaced with the compiled stylesheet by the package build.
declare const DATA_APP_STYLES: string;

export interface DataAppStylesOptions {
  /** Defaults to the current browser document. */
  document?: Document;
  /** Nonce permitted by the document's style-src CSP. */
  nonce?: string;
}

/** Install the complete UI stylesheet once per document, before mounting. */
export function injectDataAppStyles(
  options: DataAppStylesOptions = {}
): HTMLStyleElement {
  return injectStyles(
    'injectDataAppStyles',
    'data-altertable-styles',
    DATA_APP_STYLES,
    options
  );
}

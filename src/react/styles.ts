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
  const target =
    options.document ??
    (typeof document === 'undefined' ? undefined : document);
  if (!target)
    throw new Error('injectDataAppStyles requires a browser document.');
  const existing = target.querySelector<HTMLStyleElement>(
    'style[data-altertable-styles]'
  );
  if (existing) return existing;
  const style = target.createElement('style');
  style.setAttribute('data-altertable-styles', '');
  if (options.nonce !== undefined) style.nonce = options.nonce;
  style.textContent = DATA_APP_STYLES;
  target.head.append(style);

  return style;
}

import type { DataAppStylesOptions } from '@/src/react/styles';

export function injectStyles({
  name,
  attribute,
  css,
  options,
}: {
  name: string;
  attribute: string;
  css: string;
  options: DataAppStylesOptions;
}): HTMLStyleElement {
  const target =
    options.document ??
    (typeof document === 'undefined' ? undefined : document);
  if (!target) throw new Error(`${name} requires a browser document.`);
  const existing = target.querySelector<HTMLStyleElement>(
    `style[${attribute}]`
  );
  if (existing) return existing;
  const style = target.createElement('style');
  style.setAttribute(attribute, '');
  if (options.nonce !== undefined) style.nonce = options.nonce;
  style.textContent = css;
  target.head.append(style);

  return style;
}

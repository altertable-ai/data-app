import { defineMessageRoute } from './messages.ts';

/** Absolute HTTPS destinations only; URLs must not contain embedded credentials. */
export function parseExternalUrl(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > 8192 ||
    /[\s\\\p{Cc}\p{Cf}]/u.test(value)
  )
    throw new Error('Expected an absolute HTTPS URL.');
  const url = new URL(value);
  if (
    !/^https:\/\//i.test(value) ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password
  )
    throw new Error('Expected an HTTPS URL without credentials.');
  return url.href;
}

export type OpenExternalLink = { url: string };
export type ExternalLinkResult = 'opened' | 'cancelled';

/** Opt-in host route. Validation does not replace the host's destination policy. */
export const openExternalLinkRoute = /* @__PURE__ */ defineMessageRoute({
  input(value: unknown): OpenExternalLink {
    if (!value || typeof value !== 'object')
      throw new Error('Invalid external link.');
    return { url: parseExternalUrl((value as OpenExternalLink).url) };
  },
  output(value: unknown): ExternalLinkResult {
    if (value !== 'opened' && value !== 'cancelled')
      throw new Error('Invalid external link response.');
    return value;
  },
});

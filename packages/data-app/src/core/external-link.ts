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

export type ExternalLinkTarget = 'tab' | 'window';
export type ExternalLinkModifiers = {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
};
export type OpenExternalLink = { url: string } & (
  | { target?: ExternalLinkTarget }
  | { target: 'event'; keys: ExternalLinkModifiers }
);
export type ExternalLinkResult = 'opened' | 'cancelled' | 'ignored';

/** Shift takes precedence over Ctrl/Cmd; an unmodified event requests no navigation. */
export function resolveExternalLinkTarget(
  input: OpenExternalLink
): ExternalLinkTarget | null {
  if (input.target !== 'event') return input.target ?? 'tab';
  return input.keys.shiftKey
    ? 'window'
    : input.keys.metaKey || input.keys.ctrlKey
      ? 'tab'
      : null;
}

/** Opt-in host route. Validation does not replace the host's destination policy. */
export const openExternalLinkRoute = /* @__PURE__ */ defineMessageRoute({
  input(value: unknown): OpenExternalLink {
    if (!value || typeof value !== 'object')
      throw new Error('Invalid external link.');
    const input = value as Record<string, unknown>;
    const url = parseExternalUrl(input.url);
    if (input.target === undefined) return { url };
    if (input.target === 'tab' || input.target === 'window')
      return { url, target: input.target };
    if (
      input.target === 'event' &&
      input.keys &&
      typeof input.keys === 'object'
    ) {
      const keys = input.keys as Record<string, unknown>;
      if (
        typeof keys.shiftKey === 'boolean' &&
        typeof keys.metaKey === 'boolean' &&
        typeof keys.ctrlKey === 'boolean'
      )
        return {
          url,
          target: 'event',
          keys: {
            shiftKey: keys.shiftKey,
            metaKey: keys.metaKey,
            ctrlKey: keys.ctrlKey,
          },
        };
    }
    throw new Error('Invalid external navigation target.');
  },
  output(value: unknown): ExternalLinkResult {
    if (value !== 'opened' && value !== 'cancelled' && value !== 'ignored')
      throw new Error('Invalid external link response.');
    return value;
  },
});

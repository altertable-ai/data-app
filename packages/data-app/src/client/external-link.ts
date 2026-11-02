import {
  openExternalLinkRoute,
  resolveExternalLinkTarget,
  type OpenExternalLink,
  type ExternalLinkModifiers,
  type ExternalLinkResult,
} from '../core/external-link.ts';
import { MessageRoutingError } from '../core/messages.ts';
import { getDataAppTransport } from './iframe.ts';

type NavigationOptions = { signal?: AbortSignal };

async function navigate(
  input: OpenExternalLink,
  { signal }: NavigationOptions = {}
): Promise<ExternalLinkResult> {
  signal?.throwIfAborted();
  const payload = openExternalLinkRoute.input(input);
  const transport = getDataAppTransport();
  if (transport) {
    const result = await transport.request(
      { route: 'navigation:openExternal', payload },
      signal
    );
    signal?.throwIfAborted();
    return openExternalLinkRoute.output(result, payload);
  }
  if (window.parent !== window)
    throw new MessageRoutingError(
      'bridge_unavailable',
      'The host navigation bridge is unavailable.'
    );
  const target = resolveExternalLinkTarget(payload);
  if (!target) return 'ignored';
  window.open(
    payload.url,
    '_blank',
    target === 'window' ? 'popup,noopener,noreferrer' : 'noopener,noreferrer'
  );
  return 'opened';
}

/** Request a new tab through the host, or open directly when standalone. Browser settings determine placement. */
export function navigateNewTab(
  url: string,
  options?: NavigationOptions
): Promise<ExternalLinkResult> {
  return navigate({ url, target: 'tab' }, options);
}

/** Request a separate window through the host, or a popup when standalone. Browser settings determine placement. */
export function navigateNewWindow(
  url: string,
  options?: NavigationOptions
): Promise<ExternalLinkResult> {
  return navigate({ url, target: 'window' }, options);
}

/** Send only modifier keys, never the DOM/React event. Shift requests a window, Ctrl/Cmd a tab; otherwise no navigation. */
export function navigateNewWindowOrTab(
  url: string,
  event: ExternalLinkModifiers,
  options?: NavigationOptions
): Promise<ExternalLinkResult> {
  return navigate(
    {
      url,
      target: 'event',
      keys: {
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
      },
    },
    options
  );
}

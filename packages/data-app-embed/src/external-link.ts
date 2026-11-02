import {
  openExternalLinkRoute,
  MessageRoutingError,
  type OpenExternalLink,
  type ExternalLinkResult,
  type MessageContext,
} from '@altertable/data-app/contract';

/** Show a host-owned confirmation before opening a new tab. No iframe permissions are added. */
export function createExternalLinkHandler({
  window: host = window,
  allowedOrigins,
  navigate,
}: {
  window?: Window;
  /** Exact HTTPS origins. Omit to allow any HTTPS destination after confirmation. */
  allowedOrigins?: readonly string[];
  /** Called synchronously on the host confirmation click instead of native navigation.
   * The event carries confirmation-click modifiers. The callback owns popup opening
   * and opener/referrer protection; do not await before opening a window.
   */
  navigate?: (url: string, event: MouseEvent) => void;
} = {}) {
  const origins =
    allowedOrigins &&
    new Set(
      allowedOrigins.map(origin => {
        const url = new URL(origin);
        if (url.protocol !== 'https:' || url.origin !== origin)
          throw new Error('Expected an exact HTTPS origin.');
        return origin;
      })
    );
  let pending = false;
  return async function openExternalLink(
    input: OpenExternalLink,
    { signal }: MessageContext
  ): Promise<ExternalLinkResult> {
    signal.throwIfAborted();
    const { url } = openExternalLinkRoute.input(input);
    if (origins && !origins.has(new URL(url).origin))
      throw new MessageRoutingError(
        'forbidden',
        'This external destination is not allowed.'
      );
    if (pending)
      throw new MessageRoutingError(
        'external_link_busy',
        'An external link is already awaiting confirmation.'
      );
    pending = true;
    const document = host.document;
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'Open external link');
    const description = document.createElement('p');
    description.textContent = 'This app wants to open an external website:';
    const destination = document.createElement('p');
    destination.textContent = url;
    destination.style.overflowWrap = 'anywhere';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `Open ${new URL(url).host}`;
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.autofocus = true;
    dialog.append(description, destination, link, ' ', cancel);
    document.body.append(dialog);
    let cleanup: (() => void) | undefined;
    try {
      return await new Promise<ExternalLinkResult>((resolve, reject) => {
        function abort() {
          reject(signal.reason);
        }
        signal.addEventListener('abort', abort, { once: true });
        dialog.addEventListener('close', () => resolve('cancelled'));
        cancel.addEventListener('click', () => dialog.close());
        function open(event: MouseEvent) {
          if (event.type === 'auxclick' && event.button !== 1) return;
          if (navigate) {
            event.preventDefault();
            try {
              navigate(url, event);
            } catch (error) {
              reject(error);
              return;
            }
          }
          resolve('opened');
        }
        link.addEventListener('click', open);
        link.addEventListener('auxclick', open);
        // Remove the abort listener when the dialog settles, including showModal failures.
        cleanup = () => signal.removeEventListener('abort', abort);
        dialog.showModal();
      });
    } finally {
      cleanup?.();
      dialog.close();
      dialog.remove();
      pending = false;
      if (previousFocus && 'focus' in previousFocus)
        (previousFocus as HTMLElement).focus();
    }
  };
}

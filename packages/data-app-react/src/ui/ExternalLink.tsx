import {
  createMessageClient,
  getDataAppTransport,
} from '@altertable/data-app/client';
import {
  openExternalLinkRoute,
  parseExternalUrl,
} from '@altertable/data-app/contract';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from 'react';

export type ExternalLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
};

/** Open HTTPS links through the host when embedded, or a native new tab when standalone. */
export function ExternalLink({
  href,
  children,
  className,
  title,
}: ExternalLinkProps) {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => request.current?.abort(), []);
  let url: string | undefined;
  try {
    url = parseExternalUrl(href);
  } catch {
    /* Invalid destinations are not clickable. */
  }
  function open(event: MouseEvent<HTMLAnchorElement>) {
    const transport = getDataAppTransport();
    if (!url || pending) {
      event.preventDefault();
      return;
    }
    if (!transport) return;
    event.preventDefault();
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(false);
    const client = createMessageClient(
      { 'navigation:openExternal': openExternalLinkRoute },
      transport.request
    );
    void client
      .request(
        'navigation:openExternal',
        { url },
        { signal: controller.signal }
      )
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        request.current = undefined;
        if (!controller.signal.aborted) setPending(false);
      });
  }
  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        aria-disabled={!url || pending}
        aria-busy={pending || undefined}
        onClick={open}
        onAuxClick={event => {
          if (event.button === 1) open(event);
        }}
      >
        {children}
      </a>
      {(!url || error) && (
        <span role="alert">
          {!url
            ? 'Invalid external link.'
            : 'Could not open this link. The host may not support external links.'}
        </span>
      )}
    </>
  );
}

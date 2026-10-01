import { PARENT_PARAM } from '@/src/core/bridge';
import {
  attachDataAppConnection,
  type DataAppStatus,
  type DataAppHost,
  type DataAppHostOptions,
} from '@/src/embed/host';

export type DataAppSource =
  | { type: 'url'; url: string }
  | {
      type: 'bundle';
      bootstrapUrl: string;
      javascript: string;
    };
export type DataAppSourceOptions = DataAppHostOptions & {
  source: DataAppSource;
  startupTimeoutMs?: number;
};

/** Owns loading and sandbox policy. Dispose before replacing the source or retrying. */
export function attachDataAppSource({
  iframe,
  source,
  presentation,
  logger,
  onMessage,
  onStatusChange,
  onDiagnostic,
  startupTimeoutMs = 30_000,
}: DataAppSourceOptions): DataAppHost {
  const host = iframe.ownerDocument.defaultView;
  if (!host) throw new Error('The iframe requires a host window.');
  const url = new URL(
    source.type === 'url' ? source.url : source.bootstrapUrl,
    host.location.href
  );
  if (!/^https?:$/.test(url.protocol))
    throw new Error('Data apps require an HTTP(S) URL.');
  const opaque = source.type === 'bundle';
  if (!opaque && url.origin === host.location.origin)
    throw new Error('URL data apps require a separate origin from the host.');
  iframe.setAttribute(
    'sandbox',
    opaque
      ? 'allow-scripts'
      : 'allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox'
  );
  iframe.referrerPolicy = 'no-referrer';
  if (!opaque) url.searchParams.set(PARENT_PARAM, host.location.origin);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failed = false;

  function status(value: DataAppStatus) {
    if (value === 'connecting') failed = false;
    if (failed && value !== 'connecting') return;
    clearTimeout(timer);
    if (value === 'connecting' || value === 'connected')
      timer = setTimeout(() => {
        failed = true;
        bridge.dispose();
        onStatusChange?.('failed');
      }, startupTimeoutMs);
    if (value === 'failed') {
      failed = true;
      bridge.dispose();
    }
    onStatusChange?.(value);
  }

  const bridge = attachDataAppConnection({
    iframe,
    connection: opaque
      ? { type: 'opaque', token: crypto.randomUUID() }
      : { type: 'origin', origin: url.origin },
    javascript: opaque ? source.javascript : undefined,
    presentation,
    logger,
    onMessage,
    onStatusChange: status,
    onDiagnostic,
    window: host,
  });

  function error() {
    return status('failed');
  }

  iframe.addEventListener('error', error);
  iframe.src = url.href;

  function dispose() {
    clearTimeout(timer);
    iframe.removeEventListener('error', error);
    bridge.dispose();
  }

  return {
    dispose,
    setPresentation: bridge.setPresentation,
    setLogger: bridge.setLogger,
  };
}

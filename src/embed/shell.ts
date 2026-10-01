import type { DataAppPresentation } from '@/src/core/presentation';
import { PARENT_PARAM } from '@/src/core/bridge';
import type { MessageDispatcher } from '@/src/core/messages';
import {
  attachDataAppBridge,
  type DataAppStatus,
  type DataAppHost,
  type DataAppDiagnostic,
} from '@/src/embed/host';

export type DataAppSource =
  | { type: 'url'; url: string }
  | {
      type: 'bundle';
      bootstrapUrl: string;
      javascript: string;
      revision: string;
    };
export type DataAppShellOptions = {
  iframe: HTMLIFrameElement;
  source: DataAppSource;
  presentation?: DataAppPresentation;
  onMessage: MessageDispatcher;
  onStatusChange?: (status: DataAppStatus) => void;
  onDiagnostic?: (event: DataAppDiagnostic) => void;
  startupTimeoutMs?: number;
};

/** Owns loading and sandbox policy. Dispose before replacing the source or retrying. */
export function attachDataAppShell({
  iframe,
  source,
  presentation,
  onMessage,
  onStatusChange,
  onDiagnostic,
  startupTimeoutMs = 30_000,
}: DataAppShellOptions): DataAppHost {
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
    throw new Error('URL data apps require a separate origin from the shell.');
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

  const bridge = attachDataAppBridge({
    iframe,
    connection: opaque
      ? { type: 'opaque', token: crypto.randomUUID() }
      : { type: 'origin', origin: url.origin },
    javascript: opaque ? source.javascript : undefined,
    presentation,
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

  return { dispose, setPresentation: bridge.setPresentation };
}

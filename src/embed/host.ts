import {
  parsePresentation,
  type DataAppPresentation,
} from '@/src/core/presentation';
import {
  BRIDGE,
  MAX_PENDING,
  REQUEST_TIMEOUT_MS,
  isBridgeMessage,
  validId,
  type BridgeMessage,
} from '@/src/core/bridge';

import {
  MessageRoutingError,
  type MessageDispatcher,
} from '@/src/core/messages';

export type DataAppConnection =
  | { type: 'origin'; origin: string }
  | { type: 'opaque'; token: string };
export type DataAppStatus =
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'failed'
  | 'disconnected';
export type DataAppDiagnostic = { direction: 'send' | 'receive'; type: string };

export type DataAppHost = {
  dispose: () => void;
  setPresentation: (presentation?: DataAppPresentation) => void;
};

/** The bridge owns delivery and cancellation; the routed handler owns validation, authorization and execution. */
export function attachDataAppBridge({
  iframe,
  connection,
  javascript,
  presentation,
  onStatusChange,
  onDiagnostic,
  onMessage,
  window: host = window,
}: {
  iframe: HTMLIFrameElement;
  connection: DataAppConnection;
  javascript?: string;
  presentation?: DataAppPresentation;
  onStatusChange?: (status: DataAppStatus) => void;
  onDiagnostic?: (event: DataAppDiagnostic) => void;
  onMessage: MessageDispatcher;
  window?: Window;
}): DataAppHost {
  const frameOrigin = connection.type === 'origin' ? connection.origin : 'null';
  if (
    connection.type === 'origin' &&
    new URL(frameOrigin).origin !== frameOrigin
  )
    throw new Error('Expected an exact frame origin.');
  if (connection.type === 'opaque' && !validId(connection.token))
    throw new Error('Invalid sandbox token.');
  let token = connection.type === 'opaque' ? connection.token : undefined;
  const targetOrigin = connection.type === 'opaque' ? '*' : frameOrigin;
  let currentPresentation: DataAppPresentation | undefined;
  let disposed = false;
  let documentId: string | undefined;
  let sessionId: string | undefined;
  const pending = new Map<string, AbortController>();

  function hostState() {
    return {
      search: host.location.search,
      hash: host.location.hash,
      ...(currentPresentation ? { presentation: currentPresentation } : {}),
    };
  }

  function setPresentation(value: DataAppPresentation | undefined) {
    if (disposed) return;
    const next = parsePresentation(value);
    if (value !== undefined && !next)
      throw new Error('Invalid app presentation.');
    if (
      next?.surface === currentPresentation?.surface &&
      next?.theme === currentPresentation?.theme
    )
      return;
    currentPresentation = next;
    if (sessionId) publishState();
  }

  function cancelAll() {
    for (const controller of pending.values()) controller.abort();
    pending.clear();
  }

  function send(message: Partial<BridgeMessage>) {
    onDiagnostic?.({ direction: 'send', type: message.type ?? 'unknown' });
    iframe.contentWindow?.postMessage(
      {
        channel: BRIDGE,
        version: 1,
        documentId,
        sessionId,
        ...(connection.type === 'opaque' ? { token } : {}),
        ...message,
      },
      targetOrigin
    );
  }

  function error(
    id: string,
    code: string,
    message: string,
    requestId?: string
  ) {
    send({ type: 'bridge:error', id, code, message, requestId });
  }

  async function request(message: BridgeMessage) {
    const id = message.id;
    if (!validId(id) || pending.has(id)) return;
    if (pending.size >= MAX_PENDING)
      return error(id, 'bridge_busy', 'Too many pending data requests.');
    if (
      typeof message.route !== 'string' ||
      !message.route ||
      message.route.length > 256
    )
      return error(id, 'invalid_message', 'Invalid message route.');
    try {
      const body = JSON.stringify(message.payload);
      if (
        message.payload !== undefined &&
        (typeof body !== 'string' || body.length > 16_384)
      )
        throw new Error('Invalid payload');
    } catch {
      return error(
        id,
        'invalid_payload',
        'The message payload is invalid or too large.'
      );
    }
    const controller = new AbortController();
    pending.set(id, controller);
    const timer = setTimeout(() => {
      if (pending.get(id) !== controller) return;
      pending.delete(id);
      controller.abort();
      error(id, 'timeout', 'The data request timed out.');
    }, REQUEST_TIMEOUT_MS);
    controller.signal.addEventListener('abort', () => clearTimeout(timer), {
      once: true,
    });
    try {
      const response = await onMessage(
        { route: message.route, payload: message.payload },
        { signal: controller.signal }
      );
      if (pending.get(id) === controller)
        send({ type: 'bridge:result', id, response });
    } catch (failure) {
      if (pending.get(id) === controller) {
        if (failure instanceof MessageRoutingError)
          error(id, failure.code, failure.message, failure.requestId);
        else
          error(
            id,
            'request_failed',
            'The message request failed. Retry the request.'
          );
      }
    } finally {
      clearTimeout(timer);
      if (pending.get(id) === controller) pending.delete(id);
    }
  }

  function receive(event: MessageEvent) {
    if (
      event.origin !== frameOrigin ||
      event.source !== iframe.contentWindow ||
      !isBridgeMessage(event.data)
    )
      return;
    const message = event.data;
    if (connection.type === 'opaque' && message.token !== token) return;
    onDiagnostic?.({ direction: 'receive', type: message.type });
    if (message.type === 'bridge:ready') {
      if (message.documentId !== documentId) {
        cancelAll();
        documentId = message.documentId;
        sessionId = crypto.randomUUID();
      }
      onStatusChange?.('connected');
      send({
        type: 'bridge:initialize',
        state: hostState(),
      });
      if (javascript !== undefined) send({ type: 'script:load', javascript });

      return;
    }
    if (
      !sessionId ||
      message.sessionId !== sessionId ||
      message.documentId !== documentId
    )
      return;
    if (message.type === 'runtime:ready') onStatusChange?.('ready');
    else if (message.type === 'runtime:error') onStatusChange?.('failed');
    else if (message.type === 'bridge:request') void request(message);
    else if (message.type === 'bridge:cancel' && validId(message.id)) {
      pending.get(message.id)?.abort();
      pending.delete(message.id);
    } else if (message.type === 'bridge:disconnect') {
      cancelAll();
      documentId = undefined;
      sessionId = undefined;
      onStatusChange?.('disconnected');
    }
  }

  function publishState() {
    send({
      type: 'state:update',
      state: hostState(),
    });
  }

  function load() {
    if (connection.type === 'opaque') token = crypto.randomUUID();
    cancelAll();
    documentId = undefined;
    sessionId = undefined;
    onStatusChange?.('connecting');
    send({ type: 'bridge:connect', documentId: 'host' });
  }

  function dispose() {
    disposed = true;
    cancelAll();
    iframe.removeEventListener('load', load);
    host.removeEventListener('message', receive);
    host.removeEventListener('popstate', publishState);
    host.removeEventListener('pagehide', cancelAll);
  }

  setPresentation(presentation);
  iframe.addEventListener('load', load);
  host.addEventListener('message', receive);
  host.addEventListener('popstate', publishState);
  host.addEventListener('pagehide', cancelAll);
  // Reconnect an already-loaded iframe when its host bridge mounts again.
  onStatusChange?.('connecting');
  send({ type: 'bridge:connect', documentId: 'host' });

  return { dispose, setPresentation };
}

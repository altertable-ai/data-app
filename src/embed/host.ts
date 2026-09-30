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

/** The bridge owns delivery and cancellation; the routed handler owns validation, authorization and execution. */
export function attachDataAppBridge({
  iframe,
  connection,
  javascript,
  onStatusChange,
  onDiagnostic,
  onMessage,
  window: host = window,
}: {
  iframe: HTMLIFrameElement;
  connection: DataAppConnection;
  javascript?: string;
  onStatusChange?: (status: DataAppStatus) => void;
  onDiagnostic?: (event: DataAppDiagnostic) => void;
  onMessage: MessageDispatcher;
  window?: Window;
}) {
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
  let documentId: string | undefined;
  let sessionId: string | undefined;
  const pending = new Map<string, AbortController>();

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
    send({ type: 'error', id, code, message, requestId });
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
        send({ type: 'result', id, response });
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
    if (message.type === 'ready') {
      if (message.documentId !== documentId) {
        cancelAll();
        documentId = message.documentId;
        sessionId = crypto.randomUUID();
      }
      onStatusChange?.('connected');
      send({
        type: 'initialize',
        state: { search: host.location.search, hash: host.location.hash },
      });
      if (javascript !== undefined) send({ type: 'script.load', javascript });

      return;
    }
    if (
      !sessionId ||
      message.sessionId !== sessionId ||
      message.documentId !== documentId
    )
      return;
    if (message.type === 'runtime.ready') onStatusChange?.('ready');
    else if (message.type === 'runtime.error') onStatusChange?.('failed');
    else if (message.type === 'request') void request(message);
    else if (message.type === 'cancel' && validId(message.id)) {
      pending.get(message.id)?.abort();
      pending.delete(message.id);
    } else if (message.type === 'disconnect') {
      cancelAll();
      documentId = undefined;
      sessionId = undefined;
      onStatusChange?.('disconnected');
    }
  }

  function navigate() {
    send({
      type: 'state',
      state: { search: host.location.search, hash: host.location.hash },
    });
  }

  function load() {
    if (connection.type === 'opaque') token = crypto.randomUUID();
    cancelAll();
    documentId = undefined;
    sessionId = undefined;
    onStatusChange?.('connecting');
    send({ type: 'connect', documentId: 'host' });
  }

  function dispose() {
    cancelAll();
    iframe.removeEventListener('load', load);
    host.removeEventListener('message', receive);
    host.removeEventListener('popstate', navigate);
    host.removeEventListener('pagehide', cancelAll);
  }

  iframe.addEventListener('load', load);
  host.addEventListener('message', receive);
  host.addEventListener('popstate', navigate);
  host.addEventListener('pagehide', cancelAll);
  // Reconnect an already-loaded iframe when its host bridge mounts again.
  onStatusChange?.('connecting');
  send({ type: 'connect', documentId: 'host' });

  return dispose;
}

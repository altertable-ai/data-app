import { randomUuid } from '@/src/core/uuid';
import { createBridgeEndpoint } from '@/src/core/bridge-endpoint';
import type { DataAppPresentation } from '@/src/core/presentation';
import type { DataAppLogger } from '@/src/core/logger';
import {
  MAX_PENDING,
  REQUEST_TIMEOUT_MS,
  validId,
  type BridgeEventMessage,
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
export type DataAppDiagnostic = {
  direction: 'send' | 'receive';
  type: BridgeMessage['type'];
};

export type DataAppHost = {
  dispose: () => void;
  setPresentation: (presentation?: DataAppPresentation) => void;
  setLogger: (logger?: DataAppLogger) => void;
};

export type DataAppHostOptions = {
  iframe: HTMLIFrameElement;
  presentation?: DataAppPresentation;
  logger?: DataAppLogger;
  onStatusChange?: (status: DataAppStatus) => void;
  onDiagnostic?: (event: DataAppDiagnostic) => void;
  onMessage: MessageDispatcher;
};

export type DataAppConnectionOptions = DataAppHostOptions & {
  connection: DataAppConnection;
  javascript?: string;
  window?: Window;
};

/** The bridge owns delivery and cancellation; the routed handler owns validation, authorization and execution. */
export function attachDataAppConnection({
  iframe,
  connection,
  javascript,
  presentation,
  logger,
  onStatusChange,
  onDiagnostic,
  onMessage,
  window: host = window,
}: DataAppConnectionOptions): DataAppHost {
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
  let presentationIdentity: string | undefined;
  let disposed = false;
  let documentId: string | undefined;
  let sessionId: string | undefined;
  const pending = new Map<string, AbortController>();

  function hostState() {
    return {
      search: host.location.search,
      hash: host.location.hash,
      ...(currentPresentation ? { presentation: currentPresentation } : {}),
      logging: logger !== undefined,
    };
  }

  function setLogger(value: DataAppLogger | undefined) {
    if (disposed || value === logger) return;
    const wasEnabled = logger !== undefined;
    logger = value;
    if (wasEnabled !== (logger !== undefined)) publishState();
  }

  function setPresentation(value: DataAppPresentation | undefined) {
    if (disposed) return;
    const identity = JSON.stringify(value);
    if (identity === presentationIdentity) return;
    presentationIdentity = identity;
    currentPresentation =
      identity === undefined
        ? undefined
        : (JSON.parse(identity) as DataAppPresentation);
    publishState();
  }

  function cancelAll() {
    for (const controller of pending.values()) controller.abort();
    pending.clear();
  }

  const endpoint = createBridgeEndpoint({
    role: 'host',
    origin: frameOrigin,
    source: () => iframe.contentWindow,
    opaque: connection.type === 'opaque',
    context: () => ({ documentId, sessionId, token }),
    post: message => iframe.contentWindow?.postMessage(message, targetOrigin),
    diagnostic: (direction, type) => onDiagnostic?.({ direction, type }),
    invalidRequest: id => {
      if (pending.has(id)) return;
      if (pending.size >= MAX_PENDING)
        error(id, 'bridge_busy', 'Too many pending data requests.');
      else error(id, 'invalid_message', 'Invalid message route.');
    },
    handlers: {
      ready(message) {
        if (message.documentId !== documentId) {
          cancelAll();
          documentId = message.documentId;
          sessionId = randomUuid();
        }
        onStatusChange?.('connected');
        if (disposed) return;
        send('initialize', { state: hostState() });
        if (disposed) return;
        if (javascript !== undefined) send('scriptLoad', { javascript });
      },
      runtimeLog({ payload }) {
        try {
          logger?.[payload.method](...payload.args);
        } catch {
          // A host logger failure must not break bridge delivery.
        }
      },
      runtimeReady() {
        onStatusChange?.('ready');
      },
      runtimeError() {
        onStatusChange?.('failed');
      },
      request(message) {
        void request(message);
      },
      cancel(message) {
        pending.get(message.id)?.abort();
        pending.delete(message.id);
      },
      disconnect() {
        cancelAll();
        documentId = undefined;
        sessionId = undefined;
        onStatusChange?.('disconnected');
      },
    },
  });
  const send = endpoint.send;
  const receive = endpoint.receive;

  function error(
    id: string,
    code: string,
    message: string,
    requestId?: string
  ) {
    send('error', { id, code, message, requestId });
  }

  async function request(message: BridgeEventMessage<'request'>) {
    const id = message.id;
    if (pending.has(id)) return;
    if (pending.size >= MAX_PENDING)
      return error(id, 'bridge_busy', 'Too many pending data requests.');
    try {
      const body = JSON.stringify(message.payload);
      // PNG annotation captures have a separate validated 256 KiB image budget.
      const limit = message.route === 'annotation:draft' ? 384_000 : 16_384;
      if (
        message.payload !== undefined &&
        (typeof body !== 'string' || body.length > limit)
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
      if (pending.get(id) === controller) send('result', { id, response });
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

  function publishState() {
    if (disposed || !sessionId) return;
    send('stateUpdate', { state: hostState() });
  }

  function load() {
    if (connection.type === 'opaque') token = randomUuid();
    cancelAll();
    documentId = undefined;
    sessionId = undefined;
    onStatusChange?.('connecting');
    send('connect', {});
  }

  function dispose() {
    disposed = true;
    endpoint.dispose();
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
  send('connect', {});

  return { dispose, setPresentation, setLogger };
}

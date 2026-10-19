import { type DataAppLogger } from '@altertable/data-app/client';
import {
  type DataAppAnnotationPresentation,
  MessageRoutingError,
  type MessageDispatcher,
} from '@altertable/data-app/contract';
import {
  randomUuid,
  createBridgeEndpoint,
  type DataAppPresentation,
  MAX_PENDING,
  REQUEST_TIMEOUT_MS,
  validId,
  type BridgeDiagnostic,
  type BridgeEventMessage,
} from '@altertable/data-app/internal';

export type DataAppConnection =
  | { type: 'origin'; origin: string }
  | { type: 'opaque'; token: string };
export type DataAppStatus =
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'failed'
  | 'disconnected';
/** Delivery metadata only; never tokens or payloads. `durationMs` measures host handling of a request, reported on its result or error. */
export type DataAppDiagnostic = BridgeDiagnostic & { durationMs?: number };

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
  let annotationDismissal: DataAppAnnotationPresentation['dismissal'];
  let disposed = false;
  let documentId: string | undefined;
  let sessionId: string | undefined;
  const pending = new Map<string, AbortController>();
  const requestStartedAt = new Map<string, number>();

  function reportDiagnostic(event: BridgeDiagnostic) {
    if (!onDiagnostic) return;
    if (event.direction === 'drop' || !event.id) return onDiagnostic(event);
    switch (event.type) {
      case 'bridge:request':
        if (
          !requestStartedAt.has(event.id) &&
          requestStartedAt.size < MAX_PENDING * 2
        )
          requestStartedAt.set(event.id, host.performance.now());
        break;
      case 'bridge:cancel':
        requestStartedAt.delete(event.id);
        break;
      case 'bridge:result':
      case 'bridge:error': {
        const startedAt = requestStartedAt.get(event.id);
        requestStartedAt.delete(event.id);
        if (startedAt !== undefined)
          return onDiagnostic({
            ...event,
            durationMs: Math.round(host.performance.now() - startedAt),
          });
        break;
      }
    }
    onDiagnostic(event);
  }

  function hostState() {
    const presentation =
      currentPresentation?.annotations && annotationDismissal
        ? {
            ...currentPresentation,
            annotations: {
              ...currentPresentation.annotations,
              dismissal: annotationDismissal,
            },
          }
        : currentPresentation;
    return {
      search: host.location.search,
      hash: host.location.hash,
      ...(presentation ? { presentation } : {}),
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
    requestStartedAt.clear();
  }

  const endpoint = createBridgeEndpoint({
    role: 'host',
    origin: frameOrigin,
    source: () => iframe.contentWindow,
    opaque: connection.type === 'opaque',
    context: () => ({ documentId, sessionId, token }),
    post: message => iframe.contentWindow?.postMessage(message, targetOrigin),
    diagnostic: reportDiagnostic,
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

  function publishAnnotationDismissal(event: MouseEvent) {
    if (
      !currentPresentation?.annotations?.enabled ||
      event.composedPath().includes(iframe)
    )
      return;
    annotationDismissal = {
      id: randomUuid(),
      occurredAt: host.performance.timeOrigin + host.performance.now(),
    };
    publishState();
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
    host.removeEventListener('click', publishAnnotationDismissal, true);
  }

  setPresentation(presentation);
  iframe.addEventListener('load', load);
  host.addEventListener('message', receive);
  host.addEventListener('popstate', publishState);
  host.addEventListener('pagehide', cancelAll);
  host.addEventListener('click', publishAnnotationDismissal, true);
  // Reconnect an already-loaded iframe when its host bridge mounts again.
  onStatusChange?.('connecting');
  send('connect', {});

  return { dispose, setPresentation, setLogger };
}

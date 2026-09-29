import {
  BRIDGE,
  PARENT_PARAM,
  MAX_PENDING,
  REQUEST_TIMEOUT_MS,
  isBridgeMessage,
  validId,
  validLocation,
  type BridgeMessage,
  type TransportResponse,
} from '@/src/core/bridge';
import {
  dataAppRoutes,
  MessageRoutingError,
  type RoutedMessage,
  type NavigationUpdate,
} from '@/src/core/messages';
import { createAppLocation } from '@/src/client/location';
import { createMessageClient } from '@/src/client/messages';
import { DataAppError } from '@/src/client/transport';

type Pending = {
  start: () => void;
  reject: (error: unknown) => void;
  resolve: (value: unknown) => void;
};

/** One bridge per document, shared by all clients and retained across module hot replacement. */
export function createIframeTransport({
  parentOrigin,
  window: frame = window,
  timeoutMs = REQUEST_TIMEOUT_MS,
  mode = 'url',
  loadScript,
}: {
  parentOrigin: string;
  window?: Window;
  timeoutMs?: number;
  mode?: 'url' | 'bundle';
  loadScript?: (javascript: string) => void;
}) {
  if (new URL(parentOrigin).origin !== parentOrigin)
    throw new Error('Expected an exact parent origin.');
  const documentId = crypto.randomUUID();
  let token: string | undefined;
  let sessionId: string | undefined;
  let disposed = false;
  const pending = new Map<string, Pending>();
  let locationUpdate: NavigationUpdate | undefined;

  function send(message: Partial<BridgeMessage>) {
    frame.parent.postMessage(
      { channel: BRIDGE, version: 1, documentId, sessionId, token, ...message },
      parentOrigin
    );
  }

  function publishLocation() {
    if (sessionId && locationUpdate) {
      void messages
        .request('navigation.update', locationUpdate)
        .catch(() => {});
      locationUpdate = undefined;
    }
  }

  const { location: appLocation, apply } = createAppLocation(
    frame,
    mode === 'bundle',
    (location, mode) => {
      locationUpdate = { ...location, mode, title: frame.document.title };
      publishLocation();
    }
  );

  function navigate(message: BridgeMessage) {
    if (!validLocation(message)) return;
    locationUpdate = undefined;
    apply({ search: message.search!, hash: message.hash! });
  }

  function receive(event: MessageEvent) {
    if (
      event.origin !== parentOrigin ||
      event.source !== frame.parent ||
      !isBridgeMessage(event.data)
    )
      return;
    const message = event.data;
    if (message.type === 'connect') {
      if (mode === 'bundle') {
        if (!validId(message.token)) return;
        token = message.token;
      }
      send({ type: 'ready' });

      return;
    }
    if (mode === 'bundle' && (!token || message.token !== token)) return;
    if (message.documentId !== documentId) return;
    if (message.type === 'initialize' && validId(message.sessionId)) {
      if (sessionId && sessionId !== message.sessionId) {
        for (const entry of pending.values())
          entry.reject(
            new DataAppError(
              'The preview reconnected. Retry the request.',
              'bridge_reset'
            )
          );
      }
      navigate(message);
      const first = !sessionId;
      sessionId = message.sessionId;
      if (first) for (const entry of pending.values()) entry.start();
      publishLocation();
      if (mode === 'url') send({ type: 'runtime.ready' });

      return;
    }
    if (!sessionId || message.sessionId !== sessionId) return;
    if (message.type === 'navigate' && validLocation(message)) {
      navigate(message);

      return;
    }
    if (
      message.type === 'script.load' &&
      mode === 'bundle' &&
      typeof message.javascript === 'string'
    ) {
      loadScript?.(message.javascript);

      return;
    }
    if (typeof message.id !== 'string') return;
    const entry = pending.get(message.id);
    if (!entry) return;
    if (message.type === 'result' && 'response' in message) {
      entry.resolve(message.response);
    } else if (
      message.type === 'error' &&
      typeof message.code === 'string' &&
      typeof message.message === 'string'
    ) {
      entry.reject(
        new MessageRoutingError(
          message.code,
          message.message,
          typeof message.requestId === 'string' ? message.requestId : undefined
        )
      );
    }
  }

  frame.addEventListener('message', receive);

  function requestMessage(
    message: RoutedMessage,
    signal?: AbortSignal
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (disposed)
        return reject(
          new DataAppError('The preview has closed.', 'bridge_closed')
        );
      if (signal?.aborted) return reject(signal.reason);
      if (pending.size >= MAX_PENDING)
        return reject(
          new DataAppError('Too many pending data requests.', 'bridge_busy')
        );
      const id = crypto.randomUUID();
      let sent = false;

      function cleanup() {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        pending.delete(id);
      }

      function abort() {
        if (sent) send({ type: 'cancel', id });
        cleanup();
        reject(signal?.reason);
      }

      const timer = setTimeout(() => {
        if (sent) send({ type: 'cancel', id });
        cleanup();
        reject(
          new DataAppError(
            sessionId
              ? 'The data request timed out.'
              : 'The preview shell is unavailable. Reload the preview.',
            sessionId ? 'timeout' : 'bridge_unavailable'
          )
        );
      }, timeoutMs);
      const entry: Pending = {
        start() {
          if (sent) return;
          try {
            send({
              type: 'request',
              id,
              route: message.route,
              payload: message.payload,
            });
            sent = true;
          } catch {
            cleanup();
            reject(
              new DataAppError(
                'The message payload could not be sent.',
                'invalid_payload'
              )
            );
          }
        },
        resolve(value) {
          cleanup();
          resolve(value);
        },
        reject(error) {
          cleanup();
          reject(error);
        },
      };
      pending.set(id, entry);
      signal?.addEventListener('abort', abort, { once: true });
      if (sessionId) entry.start();
      else send({ type: 'ready' });
    });
  }

  const messages = createMessageClient(dataAppRoutes, requestMessage);

  async function queryData(
    operation: string,
    input: unknown,
    signal?: AbortSignal
  ): Promise<TransportResponse> {
    try {
      return await messages.request(
        'data.query',
        { operation, input },
        { signal }
      );
    } catch (error) {
      if (error instanceof MessageRoutingError)
        throw new DataAppError(error.message, error.code, error.requestId);
      throw error;
    }
  }

  function disconnect() {
    send({ type: 'disconnect' });
    sessionId = undefined;
    for (const entry of pending.values())
      entry.reject(
        new DataAppError('The preview has closed.', 'bridge_closed')
      );
  }

  function resume(event: PageTransitionEvent) {
    if (event.persisted) send({ type: 'ready' });
  }

  function dispose() {
    if (disposed) return;
    disconnect();
    disposed = true;
    frame.removeEventListener('message', receive);
    frame.removeEventListener('pagehide', disconnect);
    frame.removeEventListener('pageshow', resume);
  }

  frame.addEventListener('pagehide', disconnect);
  frame.addEventListener('pageshow', resume);
  if (mode === 'url') send({ type: 'ready' });

  return {
    request: requestMessage,
    transport: queryData,
    dispose,
    appLocation,
    ready() {
      send({ type: 'runtime.ready' });
    },
    fail() {
      send({ type: 'runtime.error' });
    },
    location(mode: 'push' | 'replace' = 'replace') {
      locationUpdate = {
        ...appLocation.snapshot(),
        mode,
        title: frame.document.title,
      };
      publishLocation();
    },
  };
}

const bridgeKey = Symbol.for('altertable.localFrameBridge');
const installedKey = Symbol.for('altertable.installedTransport');
type LocalBridge = Pick<
  ReturnType<typeof createIframeTransport>,
  'transport' | 'location'
> &
  Partial<Pick<ReturnType<typeof createIframeTransport>, 'appLocation'>>;
type FrameWindow = Window & {
  [bridgeKey]?: LocalBridge;
  [installedKey]?: ReturnType<typeof createIframeTransport>;
};

/** The URL opts into local preview; only same-origin server configuration establishes trust. */
export function localFrameBridge(): LocalBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  const frame = window as FrameWindow;
  if (frame[bridgeKey]) return frame[bridgeKey];
  const parentOrigin = new URL(frame.location.href).searchParams.get(
    PARENT_PARAM
  );
  if (!parentOrigin) return undefined;

  async function connect(parentOrigin: string) {
    try {
      const response = await frame.fetch('/__altertable/parent', {
        signal: AbortSignal.timeout(5000),
      });
      const config = (await response.json()) as { origin?: unknown };
      if (
        !response.ok ||
        config.origin !== parentOrigin ||
        frame.parent === frame
      )
        throw new Error('Invalid local parent configuration.');
      const bridge = createIframeTransport({ parentOrigin, window: frame });
      frame[bridgeKey] = bridge;
      frame[installedKey] = bridge;

      return bridge;
    } catch {
      throw new DataAppError(
        'The preview shell could not be verified. Open the URL printed by altertable app dev.',
        'bridge_unavailable'
      );
    }
  }

  const connection = connect(parentOrigin);
  // Mounting a static view may establish the bridge before any query awaits it.
  void connection.catch(() => {});

  return (frame[bridgeKey] = {
    async transport(operation, input, signal) {
      signal?.throwIfAborted();
      let abort: (() => void) | undefined;
      try {
        const bridge = signal
          ? await Promise.race([
              connection,
              new Promise<never>((_, reject) => {
                const requestSignal = signal;

                function handleAbort() {
                  reject(requestSignal.reason);
                }

                abort = handleAbort;
                requestSignal.addEventListener('abort', handleAbort, {
                  once: true,
                });
              }),
            ])
          : await connection;
        signal?.throwIfAborted();

        return bridge.transport(operation, input, signal);
      } finally {
        if (abort) signal?.removeEventListener('abort', abort);
      }
    },
    location(mode) {
      void connection.then(bridge => bridge.location(mode)).catch(() => {});
    },
  });
}

/** Install an explicitly trusted transport for hosted apps and their URL-backed controls. */
export function installDataAppTransport(
  bridge: ReturnType<typeof createIframeTransport>,
  frame: Window = window
) {
  const target = frame as FrameWindow;
  if (target[bridgeKey])
    throw new Error('A data app transport is already installed.');
  target[bridgeKey] = bridge;
  target[installedKey] = bridge;

  return () => {
    if (target[bridgeKey] === bridge) delete target[bridgeKey];
    if (target[installedKey] === bridge) delete target[installedKey];
    bridge.dispose();
  };
}

/** The bootstrap installs this before executing app code. URL apps can install an explicit connection. */
export function getDataAppTransport(frame: Window = window) {
  return (frame as FrameWindow)[installedKey];
}

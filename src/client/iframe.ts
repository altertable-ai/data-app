import { registeredQueryRoute } from '@/src/core/messages';
import { createBridgeEndpoint } from '@/src/core/bridge-endpoint';
import {
  PARENT_PARAM,
  MAX_PENDING,
  REQUEST_TIMEOUT_MS,
  type TransportResponse,
} from '@/src/core/bridge';
import {
  defineDataQueryRoute,
  sqlQueryRoute,
  MessageRoutingError,
  type RoutedMessage,
} from '@/src/core/messages';
import type { Lakehouse } from '@/src/core/contract';
import { createMessageClient } from '@/src/client/messages';
import { DataAppError } from '@/src/client/transport';
import { createBridgeLogger, logBridgeMessage } from '@/src/client/logger';

type Pending = {
  start: () => void;
  reject: (error: unknown) => void;
  resolve: (value: unknown) => void;
};

/** Data clients expose one error type for HTTP and message delivery. */
function rethrowDataMessageError(error: unknown): never {
  if (error instanceof MessageRoutingError)
    throw new DataAppError(error.message, error.code, error.requestId);
  throw error;
}

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
  let hostState: unknown;
  const stateListeners = new Set<(state: unknown) => void>();
  const logger = createBridgeLogger(
    () =>
      !disposed &&
      !!sessionId &&
      !!hostState &&
      typeof hostState === 'object' &&
      'logging' in hostState &&
      hostState.logging === true,
    entry => send('runtimeLog', { payload: entry })
  );

  const endpoint = createBridgeEndpoint({
    role: 'app',
    origin: parentOrigin,
    source: () => frame.parent,
    opaque: mode === 'bundle',
    context: () => ({ documentId, sessionId, token }),
    post(message) {
      frame.parent.postMessage(message, parentOrigin);
      logBridgeMessage(logger, message);
    },
    handlers: {
      connect(message) {
        if (mode === 'bundle') token = message.token;
        send('ready', {});
      },
      initialize(message) {
        if (sessionId && sessionId !== message.sessionId) {
          for (const entry of pending.values())
            entry.reject(
              new DataAppError(
                'The preview reconnected. Retry the request.',
                'bridge_reset'
              )
            );
        }
        const first = !sessionId;
        sessionId = message.sessionId;
        receiveState(message.state);
        if (first) for (const entry of pending.values()) entry.start();
        if (disposed) return;
        if (mode === 'url') send('runtimeReady', {});
      },
      stateUpdate(message) {
        receiveState(message.state);
      },
      scriptLoad(message) {
        if (mode === 'bundle') loadScript?.(message.javascript);
      },
      result(message) {
        pending.get(message.id)?.resolve(message.response);
      },
      error(message) {
        pending
          .get(message.id)
          ?.reject(
            new MessageRoutingError(
              message.code,
              message.message,
              message.requestId
            )
          );
      },
    },
  });
  const send = endpoint.send;
  const receive = endpoint.receive;

  function receiveState(state: unknown) {
    hostState = state;
    for (const listener of stateListeners) listener(state);
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
        if (sent) send('cancel', { id });
        cleanup();
        reject(signal?.reason);
      }

      const timer = setTimeout(() => {
        if (sent) send('cancel', { id });
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
            send('request', {
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
      else if (mode === 'url' || token) send('ready', {});
    });
  }

  const messages = createMessageClient(
    { 'data:query': defineDataQueryRoute(), 'data:sql': sqlQueryRoute },
    requestMessage
  );

  const registeredMessages = createMessageClient(
    { 'data:query': registeredQueryRoute },
    requestMessage
  );

  function queryOperation(
    operation: string,
    input: unknown,
    signal?: AbortSignal
  ): Promise<TransportResponse> {
    return messages
      .request('data:query', { operation, input }, { signal })
      .catch(rethrowDataMessageError);
  }

  function disconnect() {
    if (sessionId) send('disconnect', {});
    sessionId = undefined;
    for (const entry of pending.values())
      entry.reject(
        new DataAppError('The preview has closed.', 'bridge_closed')
      );
  }

  function resume(event: PageTransitionEvent) {
    if (event.persisted && (mode === 'url' || token)) send('ready', {});
  }

  function dispose() {
    if (disposed) return;
    disconnect();
    disposed = true;
    endpoint.dispose();
    frame.removeEventListener('message', receive);
    frame.removeEventListener('pagehide', disconnect);
    frame.removeEventListener('pageshow', resume);
    stateListeners.clear();
  }

  frame.addEventListener('pagehide', disconnect);
  frame.addEventListener('pageshow', resume);
  if (mode === 'url') send('ready', {});

  return {
    logger,
    request: requestMessage,
    transport: queryOperation,
    lakehouse: {
      queryRegistered(name, variables, { limit, signal }) {
        return registeredMessages
          .request(
            'data:query',
            {
              operation: name,
              variables: JSON.parse(JSON.stringify(variables)) as Record<
                string,
                unknown
              >,
              limit,
            },
            { signal }
          )
          .catch(rethrowDataMessageError);
      },
      queryAll(statement, { limit, signal }) {
        return messages
          .request('data:sql', { statement, limit }, { signal })
          .catch(rethrowDataMessageError);
      },
    } satisfies Lakehouse,
    dispose,
    mode,
    snapshot() {
      return hostState;
    },
    subscribe(listener: (state: unknown) => void) {
      stateListeners.add(listener);

      return () => {
        stateListeners.delete(listener);
      };
    },
    ready() {
      if (!disposed && sessionId) send('runtimeReady', {});
    },
    fail() {
      if (!disposed && sessionId) send('runtimeError', {});
    },
  };
}

export type IframeTransport = ReturnType<typeof createIframeTransport>;

const bridgeKey = Symbol.for('altertable.localFrameBridge');
const installedKey = Symbol.for('altertable.installedTransport');
type LocalBridge = Pick<
  ReturnType<typeof createIframeTransport>,
  'transport'
> & { connect?: () => Promise<ReturnType<typeof createIframeTransport>> };
type FrameWindow = Window & {
  [bridgeKey]?: LocalBridge;
  [installedKey]?: ReturnType<typeof createIframeTransport>;
};

/** The URL opts into local preview; only same-origin server configuration establishes trust. */
export function localFrameBridge(window?: Window): LocalBridge | undefined {
  const activeWindow =
    window ??
    (typeof globalThis.window === 'undefined' ? undefined : globalThis.window);
  if (!activeWindow) return undefined;
  const frame = activeWindow as FrameWindow;
  if (frame[bridgeKey]) return frame[bridgeKey];
  const parentOrigin =
    new URL(frame.location.href).searchParams.get(PARENT_PARAM) ?? '';
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
      // Another owner can install a trusted bridge while configuration is pending.
      if (frame[installedKey]) return frame[installedKey];
      if (frame[bridgeKey] !== proxy)
        throw new Error('Preview transport owner changed.');
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

  let connection: Promise<ReturnType<typeof createIframeTransport>> | undefined;

  function getConnection() {
    const installed = frame[installedKey];
    if (installed) return Promise.resolve(installed);
    if (!connection) {
      const attempt = connect(parentOrigin);
      connection = attempt;
      // Clear only this failed attempt; retained proxy references can explicitly retry.
      void attempt.catch(() => {
        if (connection === attempt) connection = undefined;
      });
    }

    return connection;
  }

  const proxy: LocalBridge = {
    async transport(operation, input, signal) {
      signal?.throwIfAborted();
      const attempt = getConnection();
      let abort: (() => void) | undefined;
      try {
        const bridge = signal
          ? await Promise.race([
              attempt,
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
          : await attempt;
        signal?.throwIfAborted();

        return bridge.transport(operation, input, signal);
      } finally {
        if (abort) signal?.removeEventListener('abort', abort);
      }
    },
    connect: getConnection,
  };
  frame[bridgeKey] = proxy;
  // Static mounting still verifies eagerly, without an unhandled rejection.
  void getConnection().catch(() => {});

  return proxy;
}

/** Install an explicitly trusted transport for hosted apps and their URL-backed controls. */
export function installDataAppTransport(
  bridge: ReturnType<typeof createIframeTransport>,
  frame: Window = window
) {
  const target = frame as FrameWindow;
  if (target[installedKey])
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

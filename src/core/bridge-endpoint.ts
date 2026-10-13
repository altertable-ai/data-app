import {
  bridgeProtocol,
  bridgeEventName,
  bridgeMessageMetadata,
  parseBridgeEnvelope,
  parseBridgeMessage,
  parseBridgePayload,
  validId,
  type BridgeDiagnostic,
  type BridgeDropReason,
  type BridgeMessage,
  type BridgeRole,
  type BridgeEventsFrom,
  type BridgePayload,
  type BridgeEnvelope,
  type BridgeHandlers,
} from '@/src/core/bridge';

type ConnectionContext = Pick<BridgeEnvelope, 'sessionId' | 'token'> & {
  documentId?: string;
};

/** The connection owns IDs and token rotation; callers can only supply event payloads. */
export function createBridgeEndpoint<const Role extends BridgeRole>({
  role,
  origin,
  source,
  opaque,
  context,
  post,
  diagnostic,
  invalidRequest,
  handlers,
}: {
  role: Role;
  handlers: BridgeHandlers<NoInfer<Role>>;
  origin: string;
  source: () => MessageEventSource | null;
  opaque: boolean;
  context: () => ConnectionContext;
  post: (message: BridgeMessage) => void;
  diagnostic?: (event: BridgeDiagnostic) => void;
  invalidRequest?: (id: string) => void;
}) {
  let disposed = false;

  function drop(reason: BridgeDropReason, type: unknown) {
    diagnostic?.({
      direction: 'drop',
      reason,
      ...(typeof type === 'string' ? { type: type.slice(0, 64) } : {}),
    });
  }

  function send<
    Name extends BridgeEventsFrom<Role>,
    const Payload extends BridgePayload<NoInfer<Name>>,
  >(
    name: Name,
    payload: Payload &
      Record<Exclude<keyof Payload, keyof BridgePayload<NoInfer<Name>>>, never>
  ) {
    if (disposed) throw new Error('The bridge endpoint has closed.');
    const definition = bridgeProtocol.events[name];
    const current = context();
    const message = parseBridgeMessage({
      ...payload,
      channel: bridgeProtocol.channel,
      version: bridgeProtocol.version,
      type: definition.wire,
      documentId: name === 'connect' ? 'host' : current.documentId,
      sessionId: current.sessionId,
      token: opaque ? current.token : undefined,
    });
    if (!message || (opaque && !validId(current.token)))
      throw new Error('The bridge is not ready to send this event.');
    diagnostic?.({ direction: 'send', ...bridgeMessageMetadata(message) });
    if (disposed) return;
    post(message);
  }

  function receive(event: MessageEvent) {
    const peer = source();
    if (disposed || !peer || event.origin !== origin || event.source !== peer)
      return;
    const envelope = parseBridgeEnvelope(event.data);
    if (!envelope) {
      const data: unknown = event.data;
      if (
        data &&
        typeof data === 'object' &&
        'channel' in data &&
        data.channel === bridgeProtocol.channel
      )
        drop('invalid_envelope', 'type' in data ? data.type : undefined);
      return;
    }
    const current = context();
    // The app learns its opaque token from a trusted host connect message.
    const connecting =
      role === 'app' && envelope.type === bridgeProtocol.events.connect.wire;
    if (
      opaque &&
      (connecting
        ? !validId(envelope.token)
        : !current.token || envelope.token !== current.token)
    )
      return drop('token_mismatch', envelope.type);
    const name = bridgeEventName(envelope.type);
    if (!name) return drop('unexpected_type', envelope.type);
    const definition = bridgeProtocol.events[name];
    if (definition.from === role) return drop('unexpected_type', envelope.type);
    if (definition.session === 'establish') {
      if (
        envelope.documentId !== current.documentId ||
        envelope.sessionId === undefined
      )
        return drop('session_mismatch', envelope.type);
    } else if (definition.session === 'current') {
      if (
        !current.sessionId ||
        envelope.sessionId !== current.sessionId ||
        envelope.documentId !== current.documentId
      )
        return drop('session_mismatch', envelope.type);
    }
    const message = parseBridgePayload(envelope, definition);
    if (!message) {
      drop('invalid_payload', envelope.type);
      if (role === 'host' && name === 'request' && validId(envelope.id))
        invalidRequest?.(envelope.id);
      return;
    }
    diagnostic?.({ direction: 'receive', ...bridgeMessageMetadata(message) });
    if (disposed) return;
    // The catalog lookup correlates the key and parsed discriminated message.
    const handler = (handlers as Record<string, (message: unknown) => void>)[
      name
    ]!;
    handler(message);
  }

  return {
    send,
    receive,
    dispose() {
      disposed = true;
    },
  };
}

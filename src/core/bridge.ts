import { isLogEntry } from '@/src/core/logger';

/** Data app delivery protocol. IDs identify a document, a shell session, and an individual call. */
export const BRIDGE = 'altertable:data-app';
export const PARENT_PARAM = '__altertable_parent';
/** Bound pending requests in the client and host independently.
 * The host enforces its own limit because frames can send messages directly. */
export const MAX_PENDING = 128;
export const REQUEST_TIMEOUT_MS = 60_000;
export type { TransportResponse } from '@/src/core/operation-types';

export function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

type Fields = Record<string, unknown>;
export type BridgeRole = 'host' | 'app';
type SessionRule = 'none' | 'establish' | 'current';

function event<
  const Wire extends string,
  const Role extends BridgeRole,
  const Session extends SessionRule,
  Payload,
>({
  wire,
  from,
  session,
  parse,
}: {
  wire: Wire;
  from: Role;
  session: Session;
  parse: (fields: Fields) => Payload;
}) {
  return { wire, from, session, parse };
}

function id(fields: Fields) {
  if (!validId(fields.id)) throw new Error('Invalid request ID.');
  return fields.id;
}

function string(fields: Fields, key: string) {
  const value = fields[key];
  if (typeof value !== 'string') throw new Error(`Invalid ${key}.`);
  return value;
}

function empty() {
  return {};
}

/** Parsers project known fields; opaque values are validated by their owning route or adapter. */
export const bridgeProtocol = {
  channel: BRIDGE,
  version: 1,
  events: {
    connect: event({
      wire: 'bridge:connect',
      from: 'host',
      session: 'none',
      parse: empty,
    }),
    ready: event({
      wire: 'bridge:ready',
      from: 'app',
      session: 'none',
      parse: empty,
    }),
    initialize: event({
      wire: 'bridge:initialize',
      from: 'host',
      session: 'establish',
      parse: fields => ({ state: fields.state }),
    }),
    request: event({
      wire: 'bridge:request',
      from: 'app',
      session: 'current',
      parse: fields => {
        const route = string(fields, 'route');
        if (!route || route.length > 256)
          throw new Error('Invalid message route.');
        return { id: id(fields), route, payload: fields.payload };
      },
    }),
    result: event({
      wire: 'bridge:result',
      from: 'host',
      session: 'current',
      parse: fields => {
        if (!Object.hasOwn(fields, 'response'))
          throw new Error('Missing response.');
        return { id: id(fields), response: fields.response };
      },
    }),
    error: event({
      wire: 'bridge:error',
      from: 'host',
      session: 'current',
      parse: fields => {
        if (
          fields.requestId !== undefined &&
          typeof fields.requestId !== 'string'
        )
          throw new Error('Invalid requestId.');
        return {
          id: id(fields),
          code: string(fields, 'code'),
          message: string(fields, 'message'),
          ...(fields.requestId === undefined
            ? {}
            : { requestId: fields.requestId }),
        };
      },
    }),
    cancel: event({
      wire: 'bridge:cancel',
      from: 'app',
      session: 'current',
      parse: fields => ({ id: id(fields) }),
    }),
    disconnect: event({
      wire: 'bridge:disconnect',
      from: 'app',
      session: 'current',
      parse: empty,
    }),
    scriptLoad: event({
      wire: 'script:load',
      from: 'host',
      session: 'current',
      parse: fields => ({ javascript: string(fields, 'javascript') }),
    }),
    stateUpdate: event({
      wire: 'state:update',
      from: 'host',
      session: 'current',
      parse: fields => ({ state: fields.state }),
    }),
    runtimeLog: event({
      wire: 'runtime:log',
      from: 'app',
      session: 'current',
      parse: fields => {
        if (!isLogEntry(fields.payload)) throw new Error('Invalid log entry.');
        return { payload: fields.payload };
      },
    }),
    runtimeReady: event({
      wire: 'runtime:ready',
      from: 'app',
      session: 'current',
      parse: empty,
    }),
    runtimeError: event({
      wire: 'runtime:error',
      from: 'app',
      session: 'current',
      parse: empty,
    }),
  },
} as const;

type Events = typeof bridgeProtocol.events;
export type BridgeEventName = keyof Events;
export type BridgePayload<Name extends BridgeEventName> = ReturnType<
  Events[Name]['parse']
>;
export type BridgeEnvelope = {
  channel: typeof BRIDGE;
  version: typeof bridgeProtocol.version;
  documentId: string;
  sessionId?: string;
  token?: string;
};
export type BridgeEventMessage<Name extends BridgeEventName> =
  Name extends BridgeEventName
    ? BridgeEnvelope & {
        type: Events[Name]['wire'];
      } & (Events[Name]['session'] extends 'none'
          ? {}
          : { sessionId: string }) &
        BridgePayload<Name>
    : never;
export type BridgeMessage = {
  [Name in BridgeEventName]: BridgeEventMessage<Name>;
}[BridgeEventName];
export type BridgeEventsFrom<Role extends BridgeRole> = {
  [Name in BridgeEventName]: Events[Name]['from'] extends Role ? Name : never;
}[BridgeEventName];
export type BridgeHandlers<Role extends BridgeRole> = {
  [Name in BridgeEventsFrom<Role extends 'host' ? 'app' : 'host'>]: (
    message: BridgeEventMessage<Name>
  ) => void;
};

const byWire = new Map<string, BridgeEventName>();
for (const name of Object.keys(bridgeProtocol.events) as BridgeEventName[]) {
  const wire = bridgeProtocol.events[name].wire;
  if (byWire.has(wire)) throw new Error(`Duplicate bridge event: ${wire}`);
  byWire.set(wire, name);
}

export function bridgeEventName(wire: string) {
  return byWire.get(wire);
}

/** Envelope parsing precedes authentication; event-specific fields remain untrusted. */
export function parseBridgeEnvelope(
  value: unknown
): (BridgeEnvelope & Fields & { type: string }) | undefined {
  if (!value || typeof value !== 'object') return;
  const fields = value as Fields;
  if (
    fields.channel !== BRIDGE ||
    fields.version !== bridgeProtocol.version ||
    typeof fields.type !== 'string' ||
    typeof fields.documentId !== 'string' ||
    !fields.documentId ||
    fields.documentId.length > 128 ||
    (fields.sessionId !== undefined && !validId(fields.sessionId)) ||
    (fields.token !== undefined && typeof fields.token !== 'string')
  )
    return;
  return fields as BridgeEnvelope & Fields & { type: string };
}

/** Project event fields after the caller has checked envelope eligibility. */
export function parseBridgePayload(
  envelope: NonNullable<ReturnType<typeof parseBridgeEnvelope>>,
  definition: Events[BridgeEventName]
): BridgeMessage | undefined {
  try {
    return {
      channel: BRIDGE,
      version: bridgeProtocol.version,
      documentId: envelope.documentId,
      ...(envelope.sessionId === undefined
        ? {}
        : { sessionId: envelope.sessionId }),
      ...(envelope.token === undefined ? {} : { token: envelope.token }),
      type: definition.wire,
      ...definition.parse(envelope),
    } as BridgeMessage;
  } catch {
    return;
  }
}

export function parseBridgeMessage(value: unknown): BridgeMessage | undefined {
  const envelope = parseBridgeEnvelope(value);
  if (!envelope) return;
  const name = bridgeEventName(envelope.type);
  if (!name) return;
  const definition = bridgeProtocol.events[name];
  if (definition.session !== 'none' && envelope.sessionId === undefined) return;
  return parseBridgePayload(envelope, definition);
}

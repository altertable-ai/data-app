/** Data app delivery protocol. IDs identify a document, a shell session, and an individual call. */
export const BRIDGE = 'altertable:data-app';
export const PARENT_PARAM = '__altertable_parent';
/** Bound pending requests in the client and host independently.
 * The host enforces its own limit because frames can send messages directly. */
export const MAX_PENDING = 128;
export const REQUEST_TIMEOUT_MS = 60_000;
export type TransportResponse = { status: number; body: unknown };
export type BridgeMessage = {
  channel: typeof BRIDGE;
  version: 1;
  type: string;
  documentId: string;
  sessionId?: string;
  id?: string;
  route?: string;
  payload?: unknown;
  response?: unknown;
  code?: string;
  message?: string;
  search?: string;
  hash?: string;
  requestId?: string;
  token?: string;
  javascript?: string;
};

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as BridgeMessage;

  return (
    message.channel === BRIDGE &&
    message.version === 1 &&
    typeof message.type === 'string' &&
    typeof message.documentId === 'string' &&
    message.documentId.length > 0 &&
    message.documentId.length <= 128
  );
}

export function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}

export function validLocation(
  message: Pick<BridgeMessage, 'search' | 'hash'>
): boolean {
  return (
    typeof message.search === 'string' &&
    message.search.length <= 16_384 &&
    (message.search === '' || message.search.startsWith('?')) &&
    typeof message.hash === 'string' &&
    message.hash.length <= 4096 &&
    (message.hash === '' || message.hash.startsWith('#'))
  );
}

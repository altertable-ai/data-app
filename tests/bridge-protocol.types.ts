import { createBridgeEndpoint } from '@/src/core/bridge-endpoint';
import type { BridgeHandlers } from '@/src/core/bridge';

function verifyProtocol() {
  const app = createBridgeEndpoint({
    role: 'app',
    origin: 'https://host.example',
    source: () => null,
    opaque: false,
    context: () => ({ documentId: 'doc', sessionId: 'session' }),
    post() {},
    handlers: {
      connect() {},
      initialize(message) {
        const session: string = message.sessionId;
        void session;
      },
      scriptLoad(message) {
        const javascript: string = message.javascript;
        void javascript;
      },
      stateUpdate() {},
      result(message) {
        const response: unknown = message.response;
        void response;
      },
      error(message) {
        const id: string = message.id;
        void id;
        // @ts-expect-error Error messages do not contain results.
        void message.response;
      },
      // @ts-expect-error Apps cannot handle their own outgoing events.
      request() {},
    },
  });
  app.send('request', { id: 'id', route: 'test:ping', payload: undefined });
  app.send('ready', {});
  // @ts-expect-error Handler registration is complete at construction.
  app.handle({});
  // @ts-expect-error Event names come from the catalog.
  app.send('requset', { id: 'id', route: 'test:ping', payload: undefined });
  // @ts-expect-error Request IDs are mandatory.
  app.send('request', { route: 'test:ping', payload: undefined });
  // @ts-expect-error Payload is part of the request contract even when undefined.
  app.send('request', { id: 'id', route: 'test:ping' });
  // @ts-expect-error Apps cannot send host events.
  app.send('result', { id: 'id', response: 3 });
  app.send('request', {
    id: 'id',
    route: 'test:ping',
    payload: undefined,
    // @ts-expect-error Envelope fields belong to the endpoint.
    sessionId: 'override',
  });
  // @ts-expect-error Empty events cannot carry envelope overrides.
  app.send('ready', { documentId: 'override' });
  const override = { documentId: 'override' };
  // @ts-expect-error Variables cannot override envelopes either.
  app.send('ready', override);
}

function verifyHandlers(handlers: BridgeHandlers<'host'>) {
  const endpoint = createBridgeEndpoint({
    role: 'host',
    handlers,
    origin: 'https://app.example',
    source: () => null,
    opaque: false,
    context: () => ({ documentId: 'doc', sessionId: 'session' }),
    post() {},
  });
  endpoint.send('error', {
    id: 'request',
    code: 'forbidden',
    message: 'Denied',
  });
  // @ts-expect-error Hosts cannot send requests.
  endpoint.send('request', { id: 'id', route: 'test:ping', payload: null });
}

void verifyProtocol;
void verifyHandlers;

function verifyConstruction() {
  const options = {
    role: 'app' as const,
    origin: 'https://host.example',
    source: () => null,
    opaque: false,
    context: () => ({ documentId: 'doc' }),
    post() {},
  };
  // @ts-expect-error An endpoint cannot be constructed without handlers.
  createBridgeEndpoint(options);
  createBridgeEndpoint({
    ...options,
    // @ts-expect-error Every incoming event needs a handler at construction.
    handlers: { connect() {} },
  });
}
void verifyConstruction;

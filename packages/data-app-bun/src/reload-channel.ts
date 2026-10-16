/** Owns reload-event connections. The caller owns watching and debounce timing. */
export function createReloadChannel() {
  const sessionId = crypto.randomUUID();
  const clients = new Map<
    ReadableStreamDefaultController<string>,
    () => void
  >();
  let closed = false;

  function connect(request: Request): Response {
    if (closed)
      return new Response('Reload channel is closed.', { status: 503 });
    let disconnect: (() => void) | undefined;
    const stream = new ReadableStream<string>({
      start(client) {
        if (request.signal.aborted) {
          client.close();
          return;
        }
        function disconnectClient() {
          if (!clients.delete(client)) return;
          request.signal.removeEventListener('abort', disconnectClient);
          try {
            client.close();
          } catch {
            /* The response may already be cancelled. */
          }
        }
        disconnect = disconnectClient;
        clients.set(client, disconnectClient);
        request.signal.addEventListener('abort', disconnectClient, {
          once: true,
        });
        client.enqueue(`event: ready\ndata: ${sessionId}\n\n`);
      },
      cancel() {
        disconnect?.();
      },
    });
    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
    });
  }

  function notify() {
    for (const [client, disconnect] of clients) {
      try {
        client.enqueue('data: reload\n\n');
      } catch {
        disconnect();
      }
    }
  }

  function close() {
    closed = true;
    for (const disconnect of clients.values()) disconnect();
  }

  return { connect, notify, close };
}

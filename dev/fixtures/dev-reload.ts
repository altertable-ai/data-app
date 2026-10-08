// Framed apps are bundled by the server, outside this page's hot-reloaded graph.
if (import.meta.hot) {
  const events = new EventSource('/__dev/reload');
  let sessionId: string | undefined;
  events.onmessage = () => location.reload();
  // A completed package build restarts the server to clear hashed module paths.
  // Reload only after reconnecting to that new server, when it can serve files.
  events.addEventListener('ready', (event: MessageEvent<string>) => {
    if (sessionId && sessionId !== event.data) location.reload();
    sessionId = event.data;
  });
  import.meta.hot.dispose(() => events.close());
}
